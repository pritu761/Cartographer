import type { DependencyEdge, ParsedFile } from "../parser/types";

export interface FolderGroup {
  id: string; // e.g. "folder:src/utils"
  path: string; // e.g. "src/utils"
  name: string; // e.g. "utils"
  parentPath: string | null;
  files: string[]; // List of file paths inside this immediate folder
  allFiles: string[]; // List of all file paths in this folder and its subfolders
}

export interface RolledEdge {
  id: string;
  source: string;
  target: string;
  originalEdges: DependencyEdge[];
  count: number;
}

/**
 * Pure function: organizes a flat list of parsed files into folder hierarchies.
 */
export function groupFilesIntoFolders(files: readonly ParsedFile[]): Map<string, FolderGroup> {
  const folders = new Map<string, FolderGroup>();

  for (const file of files) {
    const parts = file.path.split("/");
    const filename = parts.pop() || "";
    void filename; // filename extracted

    // Folder path is everything except the filename
    const folderPath = parts.join("/") || ".";
    const folderId = `folder:${folderPath}`;

    let folder = folders.get(folderId);
    if (!folder) {
      const parentParts = [...parts];
      parentParts.pop();
      const parentPath = parentParts.length > 0 ? parentParts.join("/") : parts.length > 0 ? "." : null;

      folder = {
        id: folderId,
        path: folderPath,
        name: parts[parts.length - 1] || "root",
        parentPath: parentPath ? `folder:${parentPath}` : null,
        files: [],
        allFiles: [],
      };
      folders.set(folderId, folder);
    }

    folder.files.push(file.path);
    folder.allFiles.push(file.path);

    // Also register in all parent folders' allFiles
    let currentParent = folder.parentPath;
    while (currentParent) {
      const parentFolder = folders.get(currentParent);
      if (parentFolder) {
        parentFolder.allFiles.push(file.path);
        currentParent = parentFolder.parentPath;
      } else {
        break;
      }
    }
  }

  return folders;
}

/**
 * Pure function: maps each file to its active visual node (either its own path or its folded ancestor folder).
 */
export function getVisualNodeIdForFile(
  filePath: string,
  foldedFolderIds: ReadonlySet<string>
): string {
  const parts = filePath.split("/");
  parts.pop(); // remove file name

  // Check from deepest folder up to root for the first folded container
  while (parts.length > 0) {
    const folderPath = parts.join("/");
    const folderId = `folder:${folderPath}`;
    if (foldedFolderIds.has(folderId)) {
      return folderId;
    }
    parts.pop();
  }

  if (foldedFolderIds.has("folder:.")) {
    return "folder:.";
  }

  return filePath;
}

/**
 * Pure function: rolls up dependency edges when folders are folded.
 * Multiple imports between the same visual nodes roll up into a single edge with an edge count.
 */
export function rollUpEdges(
  edges: readonly DependencyEdge[],
  foldedFolderIds: ReadonlySet<string>
): RolledEdge[] {
  const edgeMap = new Map<string, RolledEdge>();

  for (const edge of edges) {
    const visualSource = getVisualNodeIdForFile(edge.from, foldedFolderIds);
    const visualTarget = getVisualNodeIdForFile(edge.to, foldedFolderIds);

    // Internalized edges inside the same folded container are collapsed away
    if (visualSource === visualTarget) {
      continue;
    }

    const key = `${visualSource}->${visualTarget}`;
    const existing = edgeMap.get(key);

    if (existing) {
      existing.originalEdges.push(edge);
      existing.count++;
    } else {
      edgeMap.set(key, {
        id: `e-${key}`,
        source: visualSource,
        target: visualTarget,
        originalEdges: [edge],
        count: 1,
      });
    }
  }

  return Array.from(edgeMap.values());
}
