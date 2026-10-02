import type { DependencyEdge } from "../parser/types";

export interface TraversalResult {
  level1: string[];
  level2: string[];
  transitive: string[];
  distances: Record<string, number>;
}

/**
 * Pure function: calculates blast radius (what breaks if this file changes).
 * Traverses DOWNSTREAM along incoming edges: files that import this file,
 * then files that import those files, etc.
 */
export function calculateBlastRadius(
  fileId: string,
  edges: readonly DependencyEdge[]
): TraversalResult {
  const distances: Record<string, number> = {};
  const level1: string[] = [];
  const level2: string[] = [];
  const transitive: string[] = [];

  // Build incoming adjacency map: targetFile -> list of sourceFiles importing it
  const incomingMap = new Map<string, Set<string>>();
  for (const edge of edges) {
    let set = incomingMap.get(edge.to);
    if (!set) {
      set = new Set<string>();
      incomingMap.set(edge.to, set);
    }
    // Disallow self-loops
    if (edge.from !== edge.to) {
      set.add(edge.from);
    }
  }

  // BFS traversal with cycle detection
  const queue: Array<{ file: string; depth: number }> = [];
  const visited = new Set<string>([fileId]);

  const directDependents = incomingMap.get(fileId);
  if (directDependents) {
    for (const dep of directDependents) {
      visited.add(dep);
      distances[dep] = 1;
      level1.push(dep);
      transitive.push(dep);
      queue.push({ file: dep, depth: 1 });
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const nextDepth = current.depth + 1;

    const nextDependents = incomingMap.get(current.file);
    if (nextDependents) {
      for (const nextFile of nextDependents) {
        if (!visited.has(nextFile)) {
          visited.add(nextFile);
          distances[nextFile] = nextDepth;
          transitive.push(nextFile);

          if (nextDepth === 2) {
            level2.push(nextFile);
          }

          queue.push({ file: nextFile, depth: nextDepth });
        }
      }
    }
  }

  return {
    level1,
    level2,
    transitive,
    distances,
  };
}

/**
 * Pure function: calculates dependency chain (what this file depends on).
 * Traverses UPSTREAM along outgoing edges: files imported by this file,
 * then files imported by those files, etc.
 */
export function calculateDependencyChain(
  fileId: string,
  edges: readonly DependencyEdge[]
): TraversalResult {
  const distances: Record<string, number> = {};
  const level1: string[] = [];
  const level2: string[] = [];
  const transitive: string[] = [];

  // Build outgoing adjacency map: sourceFile -> list of targetFiles it imports
  const outgoingMap = new Map<string, Set<string>>();
  for (const edge of edges) {
    let set = outgoingMap.get(edge.from);
    if (!set) {
      set = new Set<string>();
      outgoingMap.set(edge.from, set);
    }
    if (edge.from !== edge.to) {
      set.add(edge.to);
    }
  }

  // BFS traversal with cycle detection
  const queue: Array<{ file: string; depth: number }> = [];
  const visited = new Set<string>([fileId]);

  const directDependencies = outgoingMap.get(fileId);
  if (directDependencies) {
    for (const dep of directDependencies) {
      visited.add(dep);
      distances[dep] = 1;
      level1.push(dep);
      transitive.push(dep);
      queue.push({ file: dep, depth: 1 });
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const nextDepth = current.depth + 1;

    const nextDependencies = outgoingMap.get(current.file);
    if (nextDependencies) {
      for (const nextFile of nextDependencies) {
        if (!visited.has(nextFile)) {
          visited.add(nextFile);
          distances[nextFile] = nextDepth;
          transitive.push(nextFile);

          if (nextDepth === 2) {
            level2.push(nextFile);
          }

          queue.push({ file: nextFile, depth: nextDepth });
        }
      }
    }
  }

  return {
    level1,
    level2,
    transitive,
    distances,
  };
}
