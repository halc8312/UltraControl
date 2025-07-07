"""
Stripe API client integration (DISABLED)
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging

from app.core.config import settings
from app.models.subscription import SubscriptionStatus

logger = logging.getLogger(__name__)

# Stripe is disabled
logger.warning("Stripe integration has been disabled. Payment features are not available.")


class StripeClient:
    """Stripe API client wrapper (DISABLED - all methods return None or raise exceptions)"""
    
    @staticmethod
    def create_customer(email: str, name: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None):
        """Create a new Stripe customer (DISABLED)"""
        raise NotImplementedError("Stripe integration is disabled")
    
    @staticmethod
    def get_customer(customer_id: str):
        """Get customer by ID (DISABLED)"""
        return None
    
    @staticmethod
    def update_customer(customer_id: str, **kwargs):
        """Update customer details (DISABLED)"""
        raise NotImplementedError("Stripe integration is disabled")
    
    @staticmethod
    def create_checkout_session(
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        mode: str = "subscription",
        metadata: Optional[Dict[str, Any]] = None,
        allow_promotion_codes: bool = True
    ):
        """Create a checkout session for subscription (DISABLED)"""
        raise NotImplementedError("Stripe integration is disabled")
    
    @staticmethod
    def create_portal_session(customer_id: str, return_url: str):
        """Create customer portal session for subscription management (DISABLED)"""
        raise NotImplementedError("Stripe integration is disabled")
    
    @staticmethod
    def get_subscription(subscription_id: str):
        """Get subscription by ID (DISABLED)"""
        return None
    
    @staticmethod
    def cancel_subscription(
        subscription_id: str,
        cancel_at_period_end: bool = True
    ):
        """Cancel a subscription (DISABLED)"""
        raise NotImplementedError("Stripe integration is disabled")
    
    @staticmethod
    def reactivate_subscription(subscription_id: str):
        """Reactivate a canceled subscription (DISABLED)"""
        raise NotImplementedError("Stripe integration is disabled")
    
    @staticmethod
    def list_prices(
        active: bool = True,
        product: Optional[str] = None,
        limit: int = 10
    ):
        """List available prices (DISABLED)"""
        return []
    
    @staticmethod
    def get_payment_intent(payment_intent_id: str):
        """Get payment intent by ID (DISABLED)"""
        return None
    
    @staticmethod
    def list_invoices(
        customer_id: str,
        limit: int = 10,
        starting_after: Optional[str] = None
    ):
        """List customer invoices (DISABLED)"""
        return []
    
    @staticmethod
    def construct_webhook_event(payload: bytes, sig_header: str):
        """Construct and verify webhook event (DISABLED)"""
        raise NotImplementedError("Stripe integration is disabled")
    
    @staticmethod
    def map_subscription_status(stripe_status: str) -> SubscriptionStatus:
        """Map Stripe subscription status to our internal status (DISABLED)"""
        return SubscriptionStatus.CANCELED


# Global instance
stripe_client = StripeClient()