// packages/ultracontrol-app/src/lib/api/interfaces/filesystem.ts

import type { BaseEntity, PaginationParams, PaginatedResponse } from './base';

/**
 * File system interfaces - unified across all projects
 */

// File types
export type FileType = 'file' | 'directory' | 'symlink' | 'special';
export type FileEncoding = 'utf8' | 'utf16' | 'ascii' | 'base64' | 'binary';

// File metadata
export interface FileStat {
  path: string;
  name: string;
  type: FileType;
  size: number;
  permissions: FilePermissions;
  createdAt: string;
  modifiedAt: string;
  accessedAt: string;
  isReadOnly: boolean;
  isHidden: boolean;
}

export interface FilePermissions {
  owner: PermissionSet;
  group: PermissionSet;
  others: PermissionSet;
  octal?: string;
}

export interface PermissionSet {
  read: boolean;
  write: boolean;
  execute: boolean;
}

// File operations
export interface FileReadRequest {
  path: string;
  encoding?: FileEncoding;
  offset?: number;
  length?: number;
}

export interface FileWriteRequest {
  path: string;
  content: string | Buffer;
  encoding?: FileEncoding;
  mode?: 'overwrite' | 'append' | 'create';
  createDirectories?: boolean;
}

export interface FileCopyRequest {
  source: string;
  destination: string;
  overwrite?: boolean;
  preserveMetadata?: boolean;
}

export interface FileMoveRequest {
  source: string;
  destination: string;
  overwrite?: boolean;
}

export interface FileDeleteRequest {
  path: string;
  recursive?: boolean;
  force?: boolean;
}

// Directory operations
export interface DirectoryListRequest extends PaginationParams {
  path: string;
  recursive?: boolean;
  includeHidden?: boolean;
  pattern?: string;
  fileTypes?: FileType[];
}

export interface DirectoryCreateRequest {
  path: string;
  recursive?: boolean;
  permissions?: FilePermissions;
}

// File content
export interface FileContent {
  path: string;
  content: string;
  encoding: FileEncoding;
  size: number;
  checksum?: string;
}

// File tree
export interface FileTreeNode {
  path: string;
  name: string;
  type: FileType;
  children?: FileTreeNode[];
  size?: number;
  modifiedAt?: string;
  expanded?: boolean;
}

export interface FileTree {
  root: string;
  nodes: FileTreeNode[];
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
}

// File search
export interface FileSearchRequest extends PaginationParams {
  query: string;
  searchIn?: 'name' | 'content' | 'both';
  paths?: string[];
  excludePaths?: string[];
  fileTypes?: string[];
  caseSensitive?: boolean;
  useRegex?: boolean;
  maxFileSize?: number;
}

export interface FileSearchResult {
  path: string;
  name: string;
  matches: FileMatch[];
  preview?: string;
}

export interface FileMatch {
  line?: number;
  column?: number;
  match: string;
  context?: string;
}

// File watch
export interface FileWatchRequest {
  paths: string[];
  events?: FileWatchEvent[];
  recursive?: boolean;
  excludePatterns?: string[];
}

export type FileWatchEvent = 'create' | 'modify' | 'delete' | 'rename' | 'all';

export interface FileWatchNotification {
  event: FileWatchEvent;
  path: string;
  oldPath?: string; // for rename events
  timestamp: string;
}

// File versioning
export interface FileVersion extends BaseEntity {
  path: string;
  version: string;
  size: number;
  checksum: string;
  author?: string;
  message?: string;
}

export interface FileHistory {
  path: string;
  versions: FileVersion[];
  currentVersion: string;
}

// File diff
export interface FileDiffRequest {
  leftPath: string;
  rightPath: string;
  leftVersion?: string;
  rightVersion?: string;
  context?: number;
  ignoreWhitespace?: boolean;
}

export interface FileDiff {
  leftPath: string;
  rightPath: string;
  changes: DiffChange[];
  statistics: DiffStatistics;
}

export interface DiffChange {
  type: 'add' | 'delete' | 'modify';
  lineNumber: number;
  content: string;
  oldContent?: string;
}

export interface DiffStatistics {
  additions: number;
  deletions: number;
  modifications: number;
}

// Archive operations
export interface ArchiveCreateRequest {
  paths: string[];
  outputPath: string;
  format: 'zip' | 'tar' | 'tar.gz' | '7z';
  compression?: 'none' | 'fast' | 'best';
  password?: string;
}

export interface ArchiveExtractRequest {
  archivePath: string;
  outputPath: string;
  password?: string;
  overwrite?: boolean;
  filter?: string[];
}

export interface ArchiveInfo {
  path: string;
  format: string;
  size: number;
  compressedSize: number;
  fileCount: number;
  encrypted: boolean;
}