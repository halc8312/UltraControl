from typing import Any, List
from datetime import datetime, timezone
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from app.api import deps
from app.db.session import get_db
from app.models import User, Subscription, Payment, PriceProduct, WebhookEvent, SubscriptionPlan, SubscriptionStatus, PaymentStatus
from app.schemas.subscription import (
    Subscription as SubscriptionSchema,
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionInfo,
    Payment as PaymentSchema,
    PaymentList,
    PriceProduct as PriceProductSchema,
    CreateCheckoutSessionRequest,
    CreateCheckoutSessionResponse,
    CreatePortalSessionRequest,
    CreatePortalSessionResponse,
)
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/prices", response_model=List[PriceProductSchema])
async def list_available_prices(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    List available subscription prices
    """
    # Return empty list for now (Stripe functionality removed)
    return []


@router.get("/subscription", response_model=SubscriptionInfo)
async def get_subscription_info(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user's subscription information
    """
    # Calculate usage
    usage = {
        "projects": len(current_user.projects),
        "max_projects": 1 if current_user.subscription_plan == SubscriptionPlan.FREE else -1,
        "tokens_used": current_user.tokens_used,
        "tokens_limit": current_user.tokens_limit,
        "storage_used_mb": sum(p.total_size_kb for p in current_user.projects) / 1024 if current_user.projects else 0,
        "storage_limit_mb": 10 if current_user.subscription_plan == SubscriptionPlan.FREE else 1024,
    }
    
    return SubscriptionInfo(
        has_subscription=False,
        subscription=None,
        current_plan=current_user.subscription_plan.value,
        can_upgrade=current_user.subscription_plan == SubscriptionPlan.FREE,
        usage=usage
    )


@router.post("/checkout", response_model=CreateCheckoutSessionResponse)
async def create_checkout_session(
    *,
    db: AsyncSession = Depends(get_db),
    checkout_request: CreateCheckoutSessionRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a checkout session for subscription (Stripe functionality removed)
    """
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Payment processing is currently unavailable"
    )


@router.post("/portal", response_model=CreatePortalSessionResponse)
async def create_portal_session(
    *,
    db: AsyncSession = Depends(get_db),
    portal_request: CreatePortalSessionRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a customer portal session for subscription management (Stripe functionality removed)
    """
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Customer portal is currently unavailable"
    )


@router.post("/cancel")
async def cancel_subscription(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Cancel current subscription at period end (Stripe functionality removed)
    """
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Subscription management is currently unavailable"
    )


@router.post("/reactivate")
async def reactivate_subscription(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Reactivate a canceled subscription (Stripe functionality removed)
    """
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Subscription management is currently unavailable"
    )


@router.get("/payments", response_model=PaymentList)
async def list_payments(
    *,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    List user's payment history (Stripe functionality removed)
    """
    return PaymentList(
        payments=[],
        total=0,
        page=page,
        page_size=page_size
    )


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Handle webhook events (Stripe functionality removed)
    """
    return {"message": "Webhook endpoint disabled"}