
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select, func

from .database import create_db_and_tables, get_session, engine
from .models import User, AuditEvent
from .schemas import LoginRequest, UserCreate, UserOut, AuditOut
from .security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables and seed starter accounts.
    create_db_and_tables()

    with Session(engine) as session:
        admin = session.exec(
            select(User).where(User.email == "admin@acme.local")
        ).first()

        if not admin:
            session.add_all(
                [
                    User(
                        email="admin@acme.local",
                        full_name="System Administrator",
                        role="admin",
                        password_hash=hash_password(
                            "ChangeMe_Admin123!"
                        ),
                    ),
                    User(
                        email="manager@acme.local",
                        full_name="IT Operations Manager",
                        role="manager",
                        password_hash=hash_password(
                            "ChangeMe_Manager123!"
                        ),
                    ),
                    User(
                        email="viewer@acme.local",
                        full_name="Read Only Analyst",
                        role="viewer",
                        password_hash=hash_password(
                            "ChangeMe_Viewer123!"
                        ),
                    ),
                ]
            )

            session.add(
                AuditEvent(
                    actor_email="system",
                    action="bootstrap",
                    target="seed-users",
                    detail="Created local starter accounts",
                )
            )
            session.commit()

    yield


app = FastAPI(
    title="Enterprise IAM Platform API",
    version="1.0.0",
    lifespan=lifespan,
)


# Allow requests from both Vite frontend ports.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://northstar-identity-cloud.onrender.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


bearer = HTTPBearer(auto_error=False)


def current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    session: Session = Depends(get_session),
):
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
        )

    payload = decode_access_token(credentials.credentials)

    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )

    user = session.exec(
        select(User).where(User.email == payload["sub"])
    ).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="Account is inactive or unavailable",
        )

    return user


def require_roles(*roles):
    def checker(user: User = Depends(current_user)):
        if user.role not in roles:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions",
            )
        return user

    return checker


def audit(
    session: Session,
    actor: str,
    action: str,
    target: str,
    detail: str = "",
):
    session.add(
        AuditEvent(
            actor_email=actor,
            action=action,
            target=target,
            detail=detail,
        )
    )
    session.commit()


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "enterprise-iam-api",
    }


@app.post("/api/auth/login")
def login(
    body: LoginRequest,
    session: Session = Depends(get_session),
):
    email = body.email.lower().strip()

    user = session.exec(
        select(User).where(User.email == email)
    ).first()

    if not user or not verify_password(
        body.password,
        user.password_hash,
    ):
        audit(
            session,
            email,
            "login_failed",
            email,
            "Invalid credentials",
        )
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is disabled",
        )

    audit(
        session,
        user.email,
        "login_success",
        user.email,
        "Signed in",
    )

    return {
        "access_token": create_access_token(
            user.email,
            user.role,
        ),
        "token_type": "bearer",
        "user": UserOut.model_validate(user),
    }


@app.get("/api/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@app.get(
    "/api/dashboard",
    openapi_extra={"security": [{"HTTPBearer": []}]},
)
def dashboard(
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    users_count = session.exec(
        select(func.count()).select_from(User)
    ).one()

    active_count = session.exec(
        select(func.count())
        .select_from(User)
        .where(User.is_active == True)
    ).one()

    audit_count = session.exec(
        select(func.count()).select_from(AuditEvent)
    ).one()

    return {
        "total_users": users_count,
        "active_users": active_count,
        "audit_events": audit_count,
        "signed_in_as": user.email,
        "role": user.role,
    }


@app.get("/api/users", response_model=list[UserOut])
def list_users(
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    return session.exec(
        select(User).order_by(User.id)
    ).all()


@app.post(
    "/api/users",
    response_model=UserOut,
    status_code=201,
)
def create_user(
    body: UserCreate,
    actor: User = Depends(require_roles("admin")),
    session: Session = Depends(get_session),
):
    email = body.email.lower().strip()

    if body.role not in {"admin", "manager", "viewer"}:
        raise HTTPException(
            status_code=422,
            detail="Role must be admin, manager, or viewer",
        )

    existing_user = session.exec(
        select(User).where(User.email == email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already exists",
        )

    user = User(
        email=email,
        full_name=body.full_name.strip(),
        role=body.role,
        password_hash=hash_password(body.password),
    )

    session.add(user)
    session.commit()
    session.refresh(user)

    audit(
        session,
        actor.email,
        "user_created",
        email,
        f"role={body.role}",
    )

    return user


@app.patch(
    "/api/users/{user_id}/status",
    response_model=UserOut,
)
def update_status(
    user_id: int,
    active: bool,
    actor: User = Depends(require_roles("admin")),
    session: Session = Depends(get_session),
):
    target = session.get(User, user_id)

    if not target:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if target.id == actor.id and not active:
        raise HTTPException(
            status_code=400,
            detail="You cannot disable your own account",
        )

    target.is_active = active
    session.add(target)
    session.commit()
    session.refresh(target)

    audit(
        session,
        actor.email,
        "user_status_changed",
        target.email,
        f"is_active={active}",
    )

    return target


@app.get("/api/audit", response_model=list[AuditOut])
def list_audit(
    actor: User = Depends(require_roles("admin", "manager")),
    session: Session = Depends(get_session),
):
    return session.exec(
        select(AuditEvent)
        .order_by(AuditEvent.id.desc())
        .limit(200)
    ).all()

