"""
Supabase Client for Async PMI Processing

Uses service role key to write directly to the database,
enabling async processing with realtime updates.

Features:
- Retry logic with exponential backoff
- Progress updates during processing
- Structured logging with correlation IDs
"""

import os
import logging
import asyncio
from typing import Optional, Any, Dict
from datetime import datetime
from functools import wraps

logger = logging.getLogger(__name__)

# Supabase configuration from environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Service role key for admin access

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY_BASE = 0.5  # seconds

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
        logger.info("Supabase client initialized", extra={
            "supabase_url": SUPABASE_URL[:30] + "..." if len(SUPABASE_URL) > 30 else SUPABASE_URL
        })
        return _client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None


def is_async_processing_enabled() -> bool:
    """Check if async processing is available."""
    return bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)


async def _retry_operation(operation, part_id: str, operation_name: str):
    """
    Retry an operation with exponential backoff.

    Args:
        operation: Async callable to retry
        part_id: Part ID for logging context
        operation_name: Name of operation for logging
    """
    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return await operation()
        except Exception as e:
            last_error = e
            if attempt < MAX_RETRIES:
                delay = RETRY_DELAY_BASE * (2 ** (attempt - 1))
                logger.warning(
                    f"[{part_id}] {operation_name} failed (attempt {attempt}/{MAX_RETRIES}), "
                    f"retrying in {delay}s: {e}"
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    f"[{part_id}] {operation_name} failed after {MAX_RETRIES} attempts: {e}"
                )

    raise last_error


async def update_pmi_status(
    part_id: str,
    status: str,
    error: Optional[str] = None,
    progress: Optional[int] = None,
    stage: Optional[str] = None,
) -> bool:
    """
    Update PMI processing status in parts.metadata.

    Status values:
    - 'pending': Queued for processing
    - 'processing': Currently being processed
    - 'complete': Processing finished successfully
    - 'error': Processing failed

    Progress (0-100) and stage can be used for granular updates.

    Returns True if update succeeded.
    """
    client = get_supabase_client()
    if not client:
        return False

    async def do_update():
        # Get current metadata
        result = client.table('parts').select('metadata').eq('id', part_id).single().execute()

        if not result.data:
            logger.error(f"[{part_id}] Part not found")
            return False

        current_metadata = result.data.get('metadata') or {}

        # Update PMI status
        updated_metadata = {
            **current_metadata,
            'pmi_status': status,
            'pmi_status_updated_at': datetime.utcnow().isoformat(),
        }

        # Add optional fields
        if progress is not None:
            updated_metadata['pmi_progress'] = progress

        if stage is not None:
            updated_metadata['pmi_stage'] = stage

        if error:
            updated_metadata['pmi_error'] = error
        elif 'pmi_error' in updated_metadata and status == 'complete':
            # Clear error on success
            del updated_metadata['pmi_error']

        # Update the part
        client.table('parts').update({'metadata': updated_metadata}).eq('id', part_id).execute()

        logger.info(
            f"[{part_id}] Status: {status}" +
            (f" ({progress}%)" if progress is not None else "") +
            (f" - {stage}" if stage else "")
        )
        return True

    try:
        return await _retry_operation(do_update, part_id, "update_pmi_status")
    except Exception as e:
        logger.error(f"[{part_id}] Failed to update status: {e}")
        return False


async def update_pmi_progress(
    part_id: str,
    progress: int,
    stage: str,
) -> bool:
    """
    Update processing progress without changing status.

    Args:
        part_id: Part UUID
        progress: Progress percentage (0-100)
        stage: Current processing stage description
    """
    return await update_pmi_status(
        part_id,
        status='processing',
        progress=progress,
        stage=stage,
    )


async def store_pmi_result(
    part_id: str,
    pmi_data: Dict[str, Any],
    processing_time_ms: int,
    geometry_stats: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Store PMI extraction result directly in parts.metadata.

    This is called after successful extraction to update the
    database with the extracted PMI data.

    Args:
        part_id: Part UUID
        pmi_data: Extracted PMI data
        processing_time_ms: Total processing time
        geometry_stats: Optional geometry statistics (vertices, faces, etc.)
    """
    client = get_supabase_client()
    if not client:
        return False

    async def do_store():
        # Get current metadata
        result = client.table('parts').select('metadata').eq('id', part_id).single().execute()

        if not result.data:
            logger.error(f"[{part_id}] Part not found")
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
            'pmi_progress': 100,
            'pmi_stage': 'Complete',
            'pmi_extracted_at': datetime.utcnow().isoformat(),
            'pmi_processing_time_ms': processing_time_ms,
        }

        # Add geometry stats if provided
        if geometry_stats:
            updated_metadata['geometry_stats'] = geometry_stats

        # Clear any previous error
        if 'pmi_error' in updated_metadata:
            del updated_metadata['pmi_error']

        # Update the part
        client.table('parts').update({'metadata': updated_metadata}).eq('id', part_id).execute()

        logger.info(
            f"[{part_id}] PMI stored: {pmi_summary['total']} items in {processing_time_ms}ms"
        )
        return True

    try:
        return await _retry_operation(do_store, part_id, "store_pmi_result")
    except Exception as e:
        logger.error(f"[{part_id}] Failed to store result: {e}")
        # Try to mark as error
        await update_pmi_status(part_id, 'error', str(e))
        return False
