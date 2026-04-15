"""
Payment endpoints for Wompi integration and manual transfers
"""
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel
from typing import Optional
import httpx
import os
import json
from datetime import datetime

from ..database import get_db
from ..models import Payment, Order
from ..auth_utils import get_current_admin_user, get_current_customer

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Wompi configuration
WOMPI_PUBLIC_KEY = os.getenv("WOMPI_PUBLIC_KEY", "pub_test_XXXXXX")
WOMPI_PRIVATE_KEY = os.getenv("WOMPI_PRIVATE_KEY", "prv_test_XXXXXX")
WOMPI_EVENT_SECRET = os.getenv("WOMPI_EVENT_SECRET", "XXXXXX")
WOMPI_API_URL = "https://production.wompi.co/v1" if os.getenv("WOMPI_ENV") == "production" else "https://sandbox.wompi.co/v1"

# Bancolombia account info
BANK_ACCOUNT = {
    "number": os.getenv("BANK_ACCOUNT_NUMBER", ""),
    "type": os.getenv("BANK_ACCOUNT_TYPE", "Ahorros"),
    "holder": os.getenv("BANK_ACCOUNT_HOLDER", ""),
    "id_number": os.getenv("BANK_ACCOUNT_ID", ""),
    "bank": "Bancolombia"
}


# ========== Schemas ==========
class PaymentCreate(BaseModel):
    order_id: int
    payment_method: str  # card, nequi, bancolombia
    amount: float


class WompiTransactionCreate(BaseModel):
    order_id: int
    payment_method: str
    acceptance_token: str
    customer_email: str


class TransferProofUpload(BaseModel):
    payment_id: int
    transfer_reference: str
    proof_url: str  # URL donde se subió el comprobante


class PaymentVerification(BaseModel):
    payment_id: int
    verified: bool
    admin_notes: Optional[str] = None


# ========== Endpoints ==========

@router.get("/config")
async def get_payment_config():
    """Get payment configuration for frontend"""
    return {
        "wompi": {
            "public_key": WOMPI_PUBLIC_KEY,
            "currency": "COP"
        },
        "bancolombia": BANK_ACCOUNT if BANK_ACCOUNT["number"] else None
    }


@router.post("/create")
async def create_payment(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_customer)
):
    """Create a new payment record"""
    # Verify order exists and belongs to user
    order = db.query(Order).filter(
        and_(Order.id == payment_data.order_id, Order.customer_id == current_user.id)
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if order already has a successful payment
    existing_payment = db.query(Payment).filter(
        and_(Payment.order_id == payment_data.order_id, Payment.status == "approved")
    ).first()
    
    if existing_payment:
        raise HTTPException(status_code=400, detail="Order already paid")
    
    # Create payment
    payment = Payment(
        order_id=payment_data.order_id,
        payment_method=payment_data.payment_method,
        amount=payment_data.amount,
        status="pending"
    )
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    return {
        "payment_id": payment.id,
        "status": payment.status,
        "amount": float(payment.amount)
    }


@router.post("/wompi/transaction")
async def create_wompi_transaction(
    transaction_data: WompiTransactionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_customer)
):
    """Create Wompi transaction via API"""
    # Get or create payment
    payment = db.query(Payment).filter(
        and_(Payment.order_id == transaction_data.order_id, Payment.status == "pending")
    ).first()
    
    if not payment:
        payment = Payment(
            order_id=transaction_data.order_id,
            payment_method=transaction_data.payment_method,
            amount=db.query(Order).get(transaction_data.order_id).total,
            status="pending"
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
    
    # Create transaction in Wompi
    headers = {"Authorization": f"Bearer {WOMPI_PRIVATE_KEY}"}
    wompi_data = {
        "acceptance_token": transaction_data.acceptance_token,
        "amount_in_cents": int(float(payment.amount) * 100),
        "currency": "COP",
        "customer_email": transaction_data.customer_email,
        "payment_method": {
            "type": "CARD" if transaction_data.payment_method == "card" else "NEQUI",
            "installments": 1
        },
        "reference": f"BM-{payment.id}-{payment.order_id}",
        "customer_data": {
            "email": transaction_data.customer_email,
            "full_name": current_user.business_name
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{WOMPI_API_URL}/transactions",
                json=wompi_data,
                headers=headers
            )
            response.raise_for_status()
            result = response.json()
            
            # Update payment with Wompi data
            payment.wompi_transaction_id = result["data"]["id"]
            payment.wompi_reference = result["data"]["reference"]
            payment.wompi_status = result["data"]["status"]
            payment.payment_data = json.dumps(result["data"])
            
            if result["data"]["status"] == "APPROVED":
                payment.status = "approved"
                # Update order status
                order = db.query(Order).get(payment.order_id)
                order.status = "confirmado"
            
            db.commit()
            
            return {"success": True, "transaction": result["data"]}
        except Exception as e:
            payment.status = "failed"
            db.commit()
            raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook/wompi")
async def wompi_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Handle Wompi webhooks for payment status updates"""
    try:
        event = await request.json()
        
        # Verify signature (TODO: implement signature verification)
        # checksum = event.get("signature", {}).get("checksum")
        
        if event["event"] == "transaction.updated":
            transaction_data = event["data"]["transaction"]
            transaction_id = transaction_data["id"]
            
            # Find payment by Wompi transaction ID
            payment = db.query(Payment).filter(
                Payment.wompi_transaction_id == transaction_id
            ).first()
            
            if payment:
                payment.wompi_status = transaction_data["status"]
                payment.updated_at = datetime.utcnow()
                
                if transaction_data["status"] == "APPROVED":
                    payment.status = "approved"
                    order = db.query(Order).get(payment.order_id)
                    order.status = "confirmado"
                elif transaction_data["status"] in ["DECLINED", "ERROR"]:
                    payment.status = "rejected"
                
                db.commit()
        
        return {"status": "received"}
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/transfer/upload-proof")
async def upload_transfer_proof(
    proof_data: TransferProofUpload,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_customer)
):
    """Upload proof of Bancolombia transfer"""
    payment = db.query(Payment).filter(Payment.id == proof_data.payment_id).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Verify payment belongs to user's order
    order = db.query(Order).filter(
        and_(Order.id == payment.order_id, Order.customer_id == current_user.id)
    ).first()
    
    if not order:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # Update payment with transfer proof
    payment.transfer_proof_url = proof_data.proof_url
    payment.transfer_reference = proof_data.transfer_reference
    payment.status = "pending"  # Waiting for admin verification
    payment.updated_at = datetime.utcnow()
    
    db.commit()
    
    # Update order status
    order.status = "pendiente_pago"
    db.commit()
    
    return {
        "success": True,
        "message": "Comprobante recibido. Tu pedido será confirmado en breve."
    }


@router.post("/verify", dependencies=[Depends(get_current_admin_user)])
async def verify_manual_payment(
    verification: PaymentVerification,
    db: Session = Depends(get_db)
):
    """Admin endpoint to verify manual transfers"""
    payment = db.query(Payment).filter(Payment.id == verification.payment_id).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if verification.verified:
        payment.status = "approved"
        payment.verified_by_admin = True
        payment.admin_notes = verification.admin_notes
        
        # Update order status
        order = db.query(Order).get(payment.order_id)
        order.status = "confirmado"
    else:
        payment.status = "rejected"
        payment.verified_by_admin = False
        payment.admin_notes = verification.admin_notes
        
        order = db.query(Order).get(payment.order_id)
        order.status = "cancelado"
    
    payment.updated_at = datetime.utcnow()
    db.commit()
    
    return {"success": True, "status": payment.status}


@router.get("/pending", dependencies=[Depends(get_current_admin_user)])
async def get_pending_payments(db: Session = Depends(get_db)):
    """Get all pending manual transfer payments for admin review"""
    pending_payments = db.query(Payment).filter(
        and_(
            Payment.payment_method == "bancolombia",
            Payment.status == "pending",
            Payment.verified_by_admin == False
        )
    ).all()
    
    results = []
    for payment in pending_payments:
        order = db.query(Order).get(payment.order_id)
        results.append({
            "payment_id": payment.id,
            "order_id": payment.order_id,
            "order_number": order.order_number,
            "amount": float(payment.amount),
            "transfer_reference": payment.transfer_reference,
            "transfer_proof_url": payment.transfer_proof_url,
            "created_at": payment.created_at.isoformat(),
            "customer_id": order.customer_id
        })
    
    return results


@router.get("/{payment_id}")
async def get_payment_status(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_customer)
):
    """Get payment status"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Verify payment belongs to user
    order = db.query(Order).filter(
        and_(Order.id == payment.order_id, Order.customer_id == current_user.id)
    ).first()
    
    if not order:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    return {
        "payment_id": payment.id,
        "order_id": payment.order_id,
        "payment_method": payment.payment_method,
        "status": payment.status,
        "amount": float(payment.amount),
        "created_at": payment.created_at.isoformat(),
        "wompi_transaction_id": payment.wompi_transaction_id
    }
