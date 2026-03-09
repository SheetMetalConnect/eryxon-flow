import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type {
  MeasurementMode,
  MeasurementPhase,
  MeasurementResult,
  SnapTarget,
  ViewerRefs,
} from './types';
import { useRaycastPicker } from './useRaycastPicker';
import {
  computePointToPoint,
  computeFaceDistance,
  computeFaceAngle,
  floodFillCoplanarFaces,
  computeFaceGroupInfo,
  collectFaceGroupPoints,
  fitCircleToPoints,
} from './computations';
import {
  createMeasurementAnnotation,
  createPreviewLine,
  updatePreviewLine,
  createFaceHighlight,
  disposeAnnotationGroup,
} from './annotations';

let measurementIdCounter = 0;
function nextId(): string {
  return `m_${++measurementIdCounter}`;
}

interface UseMeasurementsOptions {
  viewerRefs: ViewerRefs | null;
}

export function useMeasurements({ viewerRefs }: UseMeasurementsOptions) {
  const [mode, setMode] = useState<MeasurementMode>('none');
  const [phase, setPhase] = useState<MeasurementPhase>('idle');
  const [results, setResults] = useState<MeasurementResult[]>([]);

  const annotationGroupRef = useRef<THREE.Group>(new THREE.Group());
  const previewLineRef = useRef<THREE.Line | null>(null);
  const faceHighlightRef = useRef<THREE.Mesh | null>(null);
  const pendingSnapRef = useRef<SnapTarget | null>(null);
  const pendingFaceIndicesRef = useRef<number[]>([]);

  // Track refs that callbacks close over
  const modeRef = useRef(mode);
  const phaseRef = useRef(phase);
  const resultsRef = useRef(results);

  useEffect(() => {
    modeRef.current = mode;
    phaseRef.current = phase;
    resultsRef.current = results;
  }, [mode, phase, results]);

  // ── Attach annotation group to scene ───────────────────────────
  useEffect(() => {
    if (!viewerRefs) return;
    const group = annotationGroupRef.current;
    group.name = 'measurementAnnotations';
    viewerRefs.scene.add(group);

    const preview = createPreviewLine();
    viewerRefs.scene.add(preview);
    previewLineRef.current = preview;

    return () => {
      viewerRefs.scene.remove(group);
      if (previewLineRef.current) {
        viewerRefs.scene.remove(previewLineRef.current);
        previewLineRef.current.geometry.dispose();
        (previewLineRef.current.material as THREE.Material).dispose();
        previewLineRef.current = null;
      }
    };
  }, [viewerRefs]);

  // ── Clear face highlight ───────────────────────────────────────
  const clearFaceHighlight = useCallback(() => {
    if (faceHighlightRef.current && viewerRefs) {
      viewerRefs.scene.remove(faceHighlightRef.current);
      faceHighlightRef.current.geometry.dispose();
      (faceHighlightRef.current.material as THREE.Material).dispose();
      faceHighlightRef.current = null;
    }
  }, [viewerRefs]);

  // ── Delete a single result ─────────────────────────────────────
  const deleteResult = useCallback((id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));
    const child = annotationGroupRef.current.children.find(
      c => c.name === `measurement_${id}`
    );
    if (child) {
      annotationGroupRef.current.remove(child);
      disposeAnnotationGroup(child as THREE.Group);
    }
  }, []);

  // ── Add a result ───────────────────────────────────────────────
  const addResult = useCallback((result: MeasurementResult) => {
    setResults(prev => [...prev, result]);
    const annotation = createMeasurementAnnotation(result, deleteResult);
    annotationGroupRef.current.add(annotation);
  }, [deleteResult]);

  // ── Mode Activation ────────────────────────────────────────────
  const activateMode = useCallback((newMode: MeasurementMode) => {
    if (modeRef.current === newMode) {
      setMode('none');
      setPhase('idle');
      pendingSnapRef.current = null;
      clearFaceHighlight();
      if (previewLineRef.current) previewLineRef.current.visible = false;
      return;
    }
    setMode(newMode);
    setPhase('picking_first');
    pendingSnapRef.current = null;
    clearFaceHighlight();
    if (previewLineRef.current) previewLineRef.current.visible = false;
  }, [clearFaceHighlight]);

  // ── Handle Click on Model ──────────────────────────────────────
  const handleMeasurementClick = useCallback((snap: SnapTarget) => {
    const currentMode = modeRef.current;
    const currentPhase = phaseRef.current;
    if (currentMode === 'none') return;

    // ── POINT-TO-POINT ──
    if (currentMode === 'point-to-point') {
      if (currentPhase === 'picking_first') {
        pendingSnapRef.current = snap;
        setPhase('picking_second');
      } else if (currentPhase === 'picking_second' && pendingSnapRef.current) {
        const a = pendingSnapRef.current;
        const distance = computePointToPoint(a.point, snap.point);
        addResult({
          id: nextId(),
          type: 'point-to-point',
          pointA: a.point.clone(),
          pointB: snap.point.clone(),
          distance,
        });
        pendingSnapRef.current = null;
        setPhase('picking_first');
        if (previewLineRef.current) previewLineRef.current.visible = false;
      }
    }

    // ── FACE-DISTANCE ──
    if (currentMode === 'face-distance') {
      const faceIndices = floodFillCoplanarFaces(snap.mesh.geometry, snap.faceIndex);

      if (currentPhase === 'picking_first') {
        pendingSnapRef.current = snap;
        pendingFaceIndicesRef.current = faceIndices;
        clearFaceHighlight();
        const highlight = createFaceHighlight(snap.mesh.geometry, faceIndices, snap.mesh, 0x4a9eff);
        viewerRefs?.scene.add(highlight);
        faceHighlightRef.current = highlight;
        setPhase('picking_second');
      } else if (currentPhase === 'picking_second' && pendingSnapRef.current) {
        const a = pendingSnapRef.current;
        const aInfo = computeFaceGroupInfo(a.mesh.geometry, pendingFaceIndicesRef.current, a.mesh);
        const bInfo = computeFaceGroupInfo(snap.mesh.geometry, faceIndices, snap.mesh);
        const { distance, isParallel } = computeFaceDistance(
          aInfo.centroid, aInfo.normal,
          bInfo.centroid, bInfo.normal
        );
        addResult({
          id: nextId(),
          type: 'face-distance',
          faceA: aInfo,
          faceB: bInfo,
          distance,
          isParallel,
        });
        pendingSnapRef.current = null;
        clearFaceHighlight();
        setPhase('picking_first');
      }
    }

    // ── FACE-ANGLE ──
    if (currentMode === 'face-angle') {
      const faceIndices = floodFillCoplanarFaces(snap.mesh.geometry, snap.faceIndex);

      if (currentPhase === 'picking_first') {
        pendingSnapRef.current = snap;
        pendingFaceIndicesRef.current = faceIndices;
        clearFaceHighlight();
        const highlight = createFaceHighlight(snap.mesh.geometry, faceIndices, snap.mesh, 0xfbbc05);
        viewerRefs?.scene.add(highlight);
        faceHighlightRef.current = highlight;
        setPhase('picking_second');
      } else if (currentPhase === 'picking_second' && pendingSnapRef.current) {
        const a = pendingSnapRef.current;
        const aInfo = computeFaceGroupInfo(a.mesh.geometry, pendingFaceIndicesRef.current, a.mesh);
        const bInfo = computeFaceGroupInfo(snap.mesh.geometry, faceIndices, snap.mesh);
        const { includedAngleDeg, bendAngleDeg } = computeFaceAngle(aInfo.normal, bInfo.normal);
        addResult({
          id: nextId(),
          type: 'face-angle',
          faceA: aInfo,
          faceB: bInfo,
          includedAngleDeg,
          bendAngleDeg,
        });
        pendingSnapRef.current = null;
        clearFaceHighlight();
        setPhase('picking_first');
      }
    }

    // ── RADIUS ──
    if (currentMode === 'radius') {
      const faceIndices = floodFillCoplanarFaces(snap.mesh.geometry, snap.faceIndex, 30);
      const { points, normals } = collectFaceGroupPoints(snap.mesh.geometry, faceIndices, snap.mesh);
      const fit = fitCircleToPoints(points, normals);

      if (fit && fit.confidence > 0.5) {
        addResult({
          id: nextId(),
          type: 'radius',
          center: fit.center,
          axis: fit.axis,
          radius: fit.radius,
          diameter: fit.radius * 2,
          confidence: fit.confidence,
        });
      }
      // Stay in radius mode for next click
    }
  }, [viewerRefs, addResult, clearFaceHighlight]);

  // ── Handle Hover (preview line) ────────────────────────────────
  const handleHover = useCallback((snap: SnapTarget | null) => {
    if (
      modeRef.current === 'point-to-point' &&
      phaseRef.current === 'picking_second' &&
      pendingSnapRef.current &&
      snap &&
      previewLineRef.current
    ) {
      updatePreviewLine(previewLineRef.current, pendingSnapRef.current.point, snap.point);
    }
  }, []);

  // ── Wire up raycaster ──────────────────────────────────────────
  useRaycastPicker({
    viewerRefs,
    active: mode !== 'none',
    onHover: handleHover,
    onClick: handleMeasurementClick,
  });

  // ── Clear all ──────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    setResults([]);
    while (annotationGroupRef.current.children.length > 0) {
      const child = annotationGroupRef.current.children[0];
      annotationGroupRef.current.remove(child);
      disposeAnnotationGroup(child as THREE.Group);
    }
    pendingSnapRef.current = null;
    clearFaceHighlight();
    if (previewLineRef.current) previewLineRef.current.visible = false;
    setPhase(modeRef.current === 'none' ? 'idle' : 'picking_first');
  }, [clearFaceHighlight]);

  // ── Keyboard: ESC to cancel, Backspace to delete last ──────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modeRef.current !== 'none') {
        setMode('none');
        setPhase('idle');
        pendingSnapRef.current = null;
        clearFaceHighlight();
        if (previewLineRef.current) previewLineRef.current.visible = false;
      }
      if (e.key === 'Backspace' && resultsRef.current.length > 0) {
        // Prevent browser back navigation
        e.preventDefault();
        deleteResult(resultsRef.current[resultsRef.current.length - 1].id);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteResult, clearFaceHighlight]);

  return {
    mode,
    phase,
    results,
    activateMode,
    clearAll,
    deleteResult,
  };
}
