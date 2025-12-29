"""
Simple CARTESIAN_POINT Coordinate Extractor for STEP Files

This module provides a direct, modular approach to extracting 3D coordinates 
from STEP files by parsing CARTESIAN_POINT entities as plain text.

Usage:
    extractor = CartesianExtractor()
    coordinates = extractor.extract_coordinates_from_file(file_path)
"""

import re
import logging
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class CartesianExtractor:
    """Simple extractor for CARTESIAN_POINT coordinates from STEP files."""
    
    def __init__(self):
        self.coordinate_cache = {}
        
    def extract_coordinates_from_file(self, file_path: str) -> Dict[str, Tuple[float, float, float]]:
        """
        Extract all CARTESIAN_POINT coordinates from a STEP file.
        
        Args:
            file_path: Path to STEP file
            
        Returns:
            Dictionary mapping entity IDs to (x, y, z) coordinate tuples
        """
        coordinates = {}
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Find all CARTESIAN_POINT lines
            pattern = r'#(\d+)=CARTESIAN_POINT\([^,]*,\(([^)]+)\)\);'
            matches = re.findall(pattern, content)
            
            for entity_id, coord_str in matches:
                try:
                    # Parse coordinate tuple
                    coords = [float(c.strip()) for c in coord_str.split(',')]
                    if len(coords) >= 3:
                        coordinates[f'#{entity_id}'] = (coords[0], coords[1], coords[2])
                        logger.debug(f"Extracted coordinates for #{entity_id}: ({coords[0]}, {coords[1]}, {coords[2]})")
                except ValueError as e:
                    logger.warning(f"Failed to parse coordinates for #{entity_id}: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to extract coordinates from {file_path}: {e}")
            
        logger.info(f"Extracted {len(coordinates)} CARTESIAN_POINT coordinates")
        return coordinates
    
    def find_axis_placement_coordinates(self, file_path: str) -> Dict[str, Tuple[float, float, float]]:
        """
        Extract coordinates by finding AXIS2_PLACEMENT_3D entities and their associated CARTESIAN_POINTs.
        
        Args:
            file_path: Path to STEP file
            
        Returns:
            Dictionary mapping AXIS2_PLACEMENT_3D entity IDs to coordinates
        """
        coordinates = {}
        cartesian_points = self.extract_coordinates_from_file(file_path)
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Find AXIS2_PLACEMENT_3D entities and their point references
            # Pattern: #ID=AXIS2_PLACEMENT_3D('', #point_ref, ...)
            pattern = r'#(\d+)=AXIS2_PLACEMENT_3D\([^,]*,(#\d+),[^)]*\);'
            matches = re.findall(pattern, content)
            
            for entity_id, point_ref in matches:
                if point_ref in cartesian_points:
                    coordinates[f'#{entity_id}'] = cartesian_points[point_ref]
                    logger.debug(f"Mapped AXIS2_PLACEMENT_3D #{entity_id} to coordinates {cartesian_points[point_ref]}")
                    
        except Exception as e:
            logger.error(f"Failed to extract axis placement coordinates from {file_path}: {e}")
            
        logger.info(f"Mapped {len(coordinates)} AXIS2_PLACEMENT_3D entities to coordinates")
        return coordinates
    
    def get_pmi_positions(self, file_path: str) -> Dict[str, Tuple[float, float, float]]:
        """
        Get PMI annotation positions by finding presentation entities linked to coordinates.
        
        This is a simplified approach that looks for common PMI presentation patterns.
        
        Args:
            file_path: Path to STEP file
            
        Returns:
            Dictionary mapping PMI entity IDs to coordinates
        """
        # Get all coordinate mappings
        cartesian_coords = self.extract_coordinates_from_file(file_path)
        axis_coords = self.find_axis_placement_coordinates(file_path)
        
        # Combine and return non-zero coordinates for PMI positioning
        pmi_positions = {}
        
        # Filter out origin points (0,0,0) - these are typically not PMI positions
        for entity_id, coords in {**cartesian_coords, **axis_coords}.items():
            x, y, z = coords
            if not (x == 0.0 and y == 0.0 and z == 0.0):
                pmi_positions[entity_id] = coords
                
        logger.info(f"Found {len(pmi_positions)} non-zero coordinate positions for PMI")
        return pmi_positions


def extract_pmi_coordinates(file_path: str) -> List[Dict[str, float]]:
    """
    Convenience function to extract PMI coordinates from STEP file.
    
    Args:
        file_path: Path to STEP file
        
    Returns:
        List of coordinate dictionaries with 'x', 'y', 'z' keys
    """
    extractor = CartesianExtractor()
    positions = extractor.get_pmi_positions(file_path)
    
    return [
        {'x': coords[0], 'y': coords[1], 'z': coords[2]}
        for coords in positions.values()
    ]


if __name__ == "__main__":
    # Test the extractor
    import sys
    if len(sys.argv) > 1:
        test_file = sys.argv[1]
        coordinates = extract_pmi_coordinates(test_file)
        print(f"Found {len(coordinates)} PMI coordinates:")
        for i, coord in enumerate(coordinates[:10]):  # Show first 10
            print(f"  {i+1}: ({coord['x']:.2f}, {coord['y']:.2f}, {coord['z']:.2f})")