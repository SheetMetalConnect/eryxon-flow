#!/usr/bin/env python3
"""
Test STEP AP242 Text Parser PMI Extraction

Validates the text-based PMI extraction against NIST AP242 test files.
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from typing import Dict, List, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from step_parser import StepParser
from pmi_extractors import (
    PMIExtractor,
    extract_pmi_from_step,
    DimensionExtractor,
    ToleranceExtractor,
    DatumExtractor,
)


def test_step_parser(file_path: str) -> Dict[str, Any]:
    """Test the STEP parser on a single file."""
    logger.info(f"Testing parser on: {os.path.basename(file_path)}")

    start_time = time.time()
    parser = StepParser(file_path)
    parse_time = (time.time() - start_time) * 1000

    stats = parser.get_statistics()

    return {
        'file': os.path.basename(file_path),
        'total_entities': stats['total_entities'],
        'unique_types': stats['unique_types'],
        'pmi_entities': stats['pmi_entities'],
        'parse_time_ms': round(parse_time, 2),
        'success': True,
    }


def test_pmi_extraction(file_path: str) -> Dict[str, Any]:
    """Test PMI extraction on a single file."""
    logger.info(f"Testing PMI extraction on: {os.path.basename(file_path)}")

    start_time = time.time()

    try:
        pmi_data = extract_pmi_from_step(file_path)
        extraction_time = (time.time() - start_time) * 1000

        dim_count = len(pmi_data.get('dimensions', []))
        tol_count = len(pmi_data.get('geometric_tolerances', []))
        datum_count = len(pmi_data.get('datums', []))

        return {
            'file': os.path.basename(file_path),
            'dimensions': dim_count,
            'tolerances': tol_count,
            'datums': datum_count,
            'total_pmi': dim_count + tol_count + datum_count,
            'extraction_time_ms': round(extraction_time, 2),
            'success': True,
            'error': None,
        }

    except Exception as e:
        extraction_time = (time.time() - start_time) * 1000
        logger.error(f"Extraction failed: {e}")
        return {
            'file': os.path.basename(file_path),
            'dimensions': 0,
            'tolerances': 0,
            'datums': 0,
            'total_pmi': 0,
            'extraction_time_ms': round(extraction_time, 2),
            'success': False,
            'error': str(e),
        }


def test_single_file_detailed(file_path: str) -> None:
    """Run detailed test on a single file and print results."""
    print(f"\n{'='*60}")
    print(f"Testing: {os.path.basename(file_path)}")
    print('='*60)

    # Parse file
    print("\n1. Parsing STEP file...")
    parser = StepParser(file_path)
    stats = parser.get_statistics()

    print(f"   Total entities: {stats['total_entities']}")
    print(f"   Unique types: {stats['unique_types']}")
    print(f"   PMI-related entities: {stats['pmi_entities']}")

    # Show PMI entity counts
    print("\n2. PMI Entity Counts:")
    pmi_types = [
        ('DIMENSIONAL_SIZE', 'Dimensional Size'),
        ('DIMENSIONAL_LOCATION', 'Dimensional Location'),
        ('ANGULAR_LOCATION', 'Angular Location'),
        ('GEOMETRIC_TOLERANCE', 'Geometric Tolerance'),
        ('POSITION_TOLERANCE', 'Position Tolerance'),
        ('FLATNESS_TOLERANCE', 'Flatness Tolerance'),
        ('PERPENDICULARITY_TOLERANCE', 'Perpendicularity Tolerance'),
        ('SURFACE_PROFILE_TOLERANCE', 'Surface Profile Tolerance'),
        ('DATUM', 'Datum'),
        ('DATUM_FEATURE', 'Datum Feature'),
        ('PLUS_MINUS_TOLERANCE', 'Plus/Minus Tolerance'),
    ]

    for entity_type, display_name in pmi_types:
        count = len(parser.find_entities(entity_type))
        if count > 0:
            print(f"   {display_name}: {count}")

    # Extract PMI
    print("\n3. Extracting PMI...")
    pmi_data = extract_pmi_from_step(file_path)

    # Print dimensions
    dims = pmi_data.get('dimensions', [])
    print(f"\n   Dimensions ({len(dims)}):")
    for dim in dims[:5]:  # Show first 5
        print(f"      - {dim.get('text', 'N/A')} ({dim.get('type', 'unknown')})")
    if len(dims) > 5:
        print(f"      ... and {len(dims) - 5} more")

    # Print tolerances
    tols = pmi_data.get('geometric_tolerances', [])
    print(f"\n   Geometric Tolerances ({len(tols)}):")
    for tol in tols[:5]:  # Show first 5
        print(f"      - {tol.get('text', 'N/A')}")
    if len(tols) > 5:
        print(f"      ... and {len(tols) - 5} more")

    # Print datums
    datums = pmi_data.get('datums', [])
    print(f"\n   Datums ({len(datums)}):")
    for datum in datums:
        print(f"      - {datum.get('label', 'N/A')}")

    print("\n" + "="*60)


def run_batch_test(directory: str) -> None:
    """Run tests on all STEP files in a directory."""
    print("\n" + "="*70)
    print("STEP AP242 Text Parser - Batch Test")
    print("="*70)

    step_files = list(Path(directory).glob("*.stp")) + list(Path(directory).glob("*.step"))

    if not step_files:
        print(f"No STEP files found in {directory}")
        return

    print(f"\nFound {len(step_files)} STEP files\n")

    results = []
    total_dims = 0
    total_tols = 0
    total_datums = 0
    successful = 0

    for step_file in sorted(step_files):
        result = test_pmi_extraction(str(step_file))
        results.append(result)

        if result['success']:
            successful += 1
            total_dims += result['dimensions']
            total_tols += result['tolerances']
            total_datums += result['datums']

            status = f"✓ {result['dimensions']:2d} dims, {result['tolerances']:2d} tols, {result['datums']:2d} datums"
        else:
            status = f"✗ Error: {result['error'][:40]}..."

        print(f"  {result['file'][:45]:<45} {status}")

    # Print summary
    print("\n" + "-"*70)
    print("SUMMARY")
    print("-"*70)
    print(f"Files processed: {len(results)}")
    print(f"Successful: {successful}")
    print(f"Failed: {len(results) - successful}")
    print(f"\nTotal PMI extracted:")
    print(f"  - Dimensions: {total_dims}")
    print(f"  - Geometric Tolerances: {total_tols}")
    print(f"  - Datums: {total_datums}")
    print(f"  - Total: {total_dims + total_tols + total_datums}")

    # Calculate average processing time
    if results:
        avg_time = sum(r['extraction_time_ms'] for r in results) / len(results)
        print(f"\nAverage extraction time: {avg_time:.2f} ms")

    # Save detailed results to JSON
    output_file = os.path.join(directory, 'text_parser_results.json')
    with open(output_file, 'w') as f:
        json.dump({
            'summary': {
                'files_processed': len(results),
                'successful': successful,
                'failed': len(results) - successful,
                'total_dimensions': total_dims,
                'total_tolerances': total_tols,
                'total_datums': total_datums,
            },
            'results': results,
        }, f, indent=2)

    print(f"\nDetailed results saved to: {output_file}")


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description='Test STEP AP242 text-based PMI extraction'
    )
    parser.add_argument(
        'path',
        nargs='?',
        default='NIST-PMI-STEP-Files',
        help='Path to STEP file or directory (default: NIST-PMI-STEP-Files)'
    )
    parser.add_argument(
        '--detailed',
        '-d',
        action='store_true',
        help='Run detailed test on single file'
    )
    parser.add_argument(
        '--json',
        '-j',
        action='store_true',
        help='Output PMI data as JSON'
    )

    args = parser.parse_args()

    path = args.path
    if not os.path.exists(path):
        # Try relative to script location
        script_dir = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(script_dir, args.path)

    if not os.path.exists(path):
        print(f"Error: Path not found: {args.path}")
        sys.exit(1)

    if os.path.isfile(path):
        if args.json:
            pmi_data = extract_pmi_from_step(path)
            print(json.dumps(pmi_data, indent=2))
        elif args.detailed:
            test_single_file_detailed(path)
        else:
            result = test_pmi_extraction(path)
            print(json.dumps(result, indent=2))
    else:
        run_batch_test(path)


if __name__ == '__main__':
    main()
