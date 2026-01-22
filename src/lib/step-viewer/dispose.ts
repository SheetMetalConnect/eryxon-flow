/**
 * Safe Disposal Utilities
 * 
 * Proper memory management for Three.js objects.
 * All dispose operations wrapped in try-catch to prevent cascading failures.
 */

import * as THREE from 'three';
import type { DisposableObject, DisposalResult } from './types';

/**
 * Safely dispose a Three.js material.
 */
export function disposeMaterial(material: THREE.Material | THREE.Material[] | undefined): void {
  if (!material) return;
  
  try {
    if (Array.isArray(material)) {
      material.forEach(m => {
        try { m.dispose(); } catch (e) { console.warn('Error disposing material:', e); }
      });
    } else {
      material.dispose();
    }
  } catch (e) {
    console.warn('Error disposing material:', e);
  }
}

/**
 * Safely dispose a Three.js geometry.
 */
export function disposeGeometry(geometry: THREE.BufferGeometry | undefined): void {
  if (!geometry) return;
  try { geometry.dispose(); } catch (e) { console.warn('Error disposing geometry:', e); }
}

/**
 * Safely dispose a mesh including its geometry and material.
 */
export function disposeMesh(mesh: THREE.Mesh | THREE.LineSegments | THREE.Line): void {
  try {
    disposeGeometry(mesh.geometry);
    disposeMaterial(mesh.material as THREE.Material | THREE.Material[]);
  } catch (e) {
    console.warn('Error disposing mesh:', e);
  }
}

/**
 * Recursively dispose all children of a Three.js object.
 */
export function disposeObject(object: DisposableObject): void {
  if (!object) return;
  
  try {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh || 
          child instanceof THREE.LineSegments || 
          child instanceof THREE.Line) {
        disposeMesh(child);
      }
    });
  } catch (e) {
    console.warn('Error disposing object:', e);
  }
}

/**
 * Dispose an array of meshes and remove them from a scene.
 */
export function disposeMeshArray(
  meshes: THREE.Mesh[],
  scene: THREE.Scene | null
): DisposalResult {
  const result: DisposalResult = { disposed: 0, errors: [] };
  
  meshes.forEach((mesh, index) => {
    try {
      if (scene) scene.remove(mesh);
      disposeMesh(mesh);
      result.disposed++;
    } catch (e) {
      result.errors.push(`Failed to dispose mesh ${index}: ${e}`);
    }
  });
  
  return result;
}

/**
 * Dispose an array of edge LineSegments/Lines.
 */
export function disposeEdgeArray(
  edges: (THREE.LineSegments | THREE.Line)[],
  scene: THREE.Scene | null
): DisposalResult {
  const result: DisposalResult = { disposed: 0, errors: [] };
  
  edges.forEach((edge, index) => {
    try {
      if (scene) scene.remove(edge);
      disposeMesh(edge);
      result.disposed++;
    } catch (e) {
      result.errors.push(`Failed to dispose edge ${index}: ${e}`);
    }
  });
  
  return result;
}

/**
 * Dispose a GridHelper.
 */
export function disposeGrid(grid: THREE.GridHelper | null, scene: THREE.Scene | null): void {
  if (!grid) return;
  
  try {
    if (scene) scene.remove(grid);
    disposeGeometry(grid.geometry);
    disposeMaterial(grid.material as THREE.Material | THREE.Material[]);
  } catch (e) {
    console.warn('Error disposing grid:', e);
  }
}

/**
 * Dispose a dimension lines group.
 */
export function disposeDimensionLines(group: THREE.Group | null, scene: THREE.Scene | null): void {
  if (!group) return;
  
  try {
    if (scene) scene.remove(group);
    disposeObject(group);
  } catch (e) {
    console.warn('Error disposing dimension lines:', e);
  }
}
