"""
Supabase Client for Async PMI Processing

Uses service role key to write directly to the database,
enabling async processing with realtime updates.
"""

import os
import logging
from typing import Optional, Any, Dict
from datetime import datetime

logger = logging.getLogger(__name__)

# Supabase configuration from environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Service role key for admin access

_client = None


def get_supabase_client():
    """Get or create Supabase client singleton."""
    global _client

    if _client is not None:
        return _client

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.warning("Supabase not configured - async processing disabled")
        return None

    try:
        from supabase import create_client, Client
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        logger.info("Supabase client initialized")
        return _client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None


def is_async_processing_enabled() -> bool:
    """Check if async processing is available."""
    return bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)


async def update_pmi_status(
    part_id: str,
    status: str,
    error: Optional[str] = None
) -> bool:
    """
    Update PMI processing status in parts.metadata.

    Status values:
    - 'pending': Queued for processing
    - 'processing': Currently being processed
    - 'complete': Processing finished successfully
    - 'error': Processing failed

    Returns True if update succeeded.
    """
    client = get_supabase_client()
    if not client:
        return False

    try:
        # Get current metadata
        result = client.table('parts').select('metadata').eq('id', part_id).single().execute()

        if not result.data:
            logger.error(f"Part not found: {part_id}")
            return False

        current_metadata = result.data.get('metadata') or {}

        # Update PMI status
        updated_metadata = {
            **current_metadata,
            'pmi_status': status,
            'pmi_status_updated_at': datetime.utcnow().isoformat(),
        }

        if error:
            updated_metadata['pmi_error'] = error
        elif 'pmi_error' in updated_metadata and status == 'complete':
            # Clear error on success
            del updated_metadata['pmi_error']

        # Update the part
        client.table('parts').update({'metadata': updated_metadata}).eq('id', part_id).execute()

        logger.info(f"Updated PMI status for part {part_id}: {status}")
        return True

    except Exception as e:
        logger.error(f"Failed to update PMI status: {e}")
        return False


async def store_pmi_result(
    part_id: str,
    pmi_data: Dict[str, Any],
    processing_time_ms: int
) -> bool:
    """
    Store PMI extraction result directly in parts.metadata.

    This is called after successful extraction to update the
    database with the extracted PMI data.
    """
    client = get_supabase_client()
    if not client:
        return False

    try:
        # Get current metadata
        result = client.table('parts').select('metadata').eq('id', part_id).single().execute()

        if not result.data:
            logger.error(f"Part not found: {part_id}")
            return False

        current_metadata = result.data.get('metadata') or {}

        # Build PMI summary for quick access
        pmi_summary = {
            'dimensions': len(pmi_data.get('dimensions', [])),
            'geometric_tolerances': len(pmi_data.get('geometric_tolerances', [])),
            'datums': len(pmi_data.get('datums', [])),
            'surface_finishes': len(pmi_data.get('surface_finishes', [])),
            'notes': len(pmi_data.get('notes', [])),
            'graphical_pmi': len(pmi_data.get('graphical_pmi', [])),
        }
        pmi_summary['total'] = sum(pmi_summary.values())

        # Update metadata with PMI
        updated_metadata = {
            **current_metadata,
            'pmi': pmi_data,
            'pmi_summary': pmi_summary,
            'pmi_status': 'complete',
            'pmi_extracted_at': datetime.utcnow().isoformat(),
            'pmi_processing_time_ms': processing_time_ms,
        }

        # Clear any previous error
        if 'pmi_error' in updated_metadata:
            del updated_metadata['pmi_error']

        # Update the part
        client.table('parts').update({'metadata': updated_metadata}).eq('id', part_id).execute()

        logger.info(
            f"Stored PMI for part {part_id}: "
            f"{pmi_summary['total']} items in {processing_time_ms}ms"
        )
        return True

    except Exception as e:
        logger.error(f"Failed to store PMI result: {e}")
        # Try to mark as error
        await update_pmi_status(part_id, 'error', str(e))
        return False
