from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import StaticPool

from app.core.config import settings

# SQLite connection string for development
sqlite_url = settings.DATABASE_URL.replace("postgresql+asyncpg", "sqlite+aiosqlite")

# Create async engine with SQLite configuration
engine = create_async_engine(
    sqlite_url,
    echo=settings.DEBUG,
    future=True,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool  # For SQLite in-memory database
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Create base class for models
Base = declarative_base()


# Dependency to get DB session
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()