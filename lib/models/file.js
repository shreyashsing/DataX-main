import { ObjectId } from "mongodb";
import { connectToDatabase } from "../mongodb";
import { getDatasetById } from "./dataset";

// Helper function to normalize IDs
function normalizeId(id) {
  if (!id) return null;
  return typeof id === 'string' && id.length === 24 
    ? new ObjectId(id) 
    : id;
}

// Create a new file entry
export async function createFileEntry(fileData, datasetId, userId) {
  try {
    const { db } = await connectToDatabase();
    const normalizedDatasetId = normalizeId(datasetId);
    const normalizedUserId = normalizeId(userId);
    
    // Get dataset to validate it exists and the user has permission
    const dataset = await getDatasetById(normalizedDatasetId);
    if (!dataset) {
      return { success: false, error: "Dataset not found" };
    }
    
    // Check if user is creator or collaborator
    const creatorId = normalizeId(dataset.creatorId);
    let hasPermission = creatorId.toString() === normalizedUserId.toString();
    
    if (!hasPermission && Array.isArray(dataset.collaborators)) {
      hasPermission = dataset.collaborators.some(collab => {
        if (typeof collab === 'object') {
          const collabId = normalizeId(collab.userId);
          return collabId.toString() === normalizedUserId.toString() && 
                ['editor', 'admin'].includes(collab.permission);
        }
        return false;
      });
    }
    
    if (!hasPermission) {
      return { success: false, error: "Not authorized to add files to this dataset" };
    }
    
    const newFile = {
      ...fileData,
      datasetId: normalizedDatasetId,
      uploaderId: normalizedUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: fileData.status || "pending",
      size: fileData.size || 0,
      downloads: 0
    };
    
    const result = await db.collection("files").insertOne(newFile);
    
    if (!result.insertedId) {
      return { success: false, error: "Failed to create file entry" };
    }
    
    return {
      success: true,
      fileId: result.insertedId,
      file: { ...newFile, _id: result.insertedId }
    };
  } catch (error) {
    console.error("Error creating file entry:", error);
    return { success: false, error: error.message };
  }
}

// Get file by ID
export async function getFileById(fileId) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(fileId);
    
    const file = await db.collection("files").findOne({ _id: objectId });
    
    if (!file) {
      return null;
    }
    
    return file;
  } catch (error) {
    console.error("Error getting file by ID:", error);
    return null;
  }
}

// Update file entry
export async function updateFileEntry(fileId, updateData, userId) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(fileId);
    const normalizedUserId = normalizeId(userId);
    
    // Get file to check permissions
    const existingFile = await getFileById(objectId);
    
    if (!existingFile) {
      return { success: false, error: "File not found" };
    }
    
    // Get dataset to check permissions
    const dataset = await getDatasetById(existingFile.datasetId);
    if (!dataset) {
      return { success: false, error: "Associated dataset not found" };
    }
    
    // Check if user is creator or collaborator
    const creatorId = normalizeId(dataset.creatorId);
    let hasPermission = creatorId.toString() === normalizedUserId.toString();
    
    if (!hasPermission && Array.isArray(dataset.collaborators)) {
      hasPermission = dataset.collaborators.some(collab => {
        if (typeof collab === 'object') {
          const collabId = normalizeId(collab.userId);
          return collabId.toString() === normalizedUserId.toString() && 
                ['editor', 'admin'].includes(collab.permission);
        }
        return false;
      });
    }
    
    if (!hasPermission) {
      return { success: false, error: "Not authorized to update this file" };
    }
    
    // Prepare update data
    const fileUpdate = {
      ...updateData,
      updatedAt: new Date()
    };
    
    // Don't allow updating certain fields
    delete fileUpdate._id;
    delete fileUpdate.datasetId;
    delete fileUpdate.uploaderId;
    delete fileUpdate.createdAt;
    delete fileUpdate.downloads;
    
    const result = await db.collection("files").updateOne(
      { _id: objectId },
      { $set: fileUpdate }
    );
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "Failed to update file" };
    }
    
    const updatedFile = await getFileById(objectId);
    
    return { 
      success: true, 
      file: updatedFile
    };
  } catch (error) {
    console.error("Error updating file:", error);
    return { success: false, error: error.message };
  }
}

// Delete file
export async function deleteFile(fileId, userId) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(fileId);
    const normalizedUserId = normalizeId(userId);
    
    // Get file to check permissions
    const existingFile = await getFileById(objectId);
    
    if (!existingFile) {
      return { success: false, error: "File not found" };
    }
    
    // Get dataset to check permissions
    const dataset = await getDatasetById(existingFile.datasetId);
    if (!dataset) {
      return { success: false, error: "Associated dataset not found" };
    }
    
    // Check if user is creator or collaborator
    const creatorId = normalizeId(dataset.creatorId);
    let hasPermission = creatorId.toString() === normalizedUserId.toString();
    
    if (!hasPermission && Array.isArray(dataset.collaborators)) {
      hasPermission = dataset.collaborators.some(collab => {
        if (typeof collab === 'object') {
          const collabId = normalizeId(collab.userId);
          return collabId.toString() === normalizedUserId.toString() && 
                ['editor', 'admin'].includes(collab.permission);
        }
        return false;
      });
    }
    
    if (!hasPermission) {
      return { success: false, error: "Not authorized to delete this file" };
    }
    
    // Delete actual file from storage (should be implemented based on storage solution)
    // TODO: Implement file storage deletion
    
    // Delete file entry
    const result = await db.collection("files").deleteOne({ _id: objectId });
    
    if (result.deletedCount === 0) {
      return { success: false, error: "Failed to delete file" };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting file:", error);
    return { success: false, error: error.message };
  }
}

// List files for a dataset
export async function getDatasetFiles(datasetId, options = {}) {
  try {
    const { db } = await connectToDatabase();
    const normalizedDatasetId = normalizeId(datasetId);
    
    const { 
      limit = 50, 
      page = 1,
      sortBy = "createdAt",
      sortOrder = -1,
      fileTypes,
      status
    } = options;
    
    // Build query
    const query = { datasetId: normalizedDatasetId };
    
    if (fileTypes && Array.isArray(fileTypes) && fileTypes.length > 0) {
      query.fileType = { $in: fileTypes };
    }
    
    if (status) {
      query.status = status;
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder;
    
    // Get files
    const files = await db.collection("files")
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Get total count for pagination
    const total = await db.collection("files").countDocuments(query);
    
    return {
      files,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error("Error getting dataset files:", error);
    return { 
      files: [],
      pagination: {
        total: 0,
        page: options.page || 1,
        limit: options.limit || 50,
        pages: 0
      }
    };
  }
}

// Record file download
export async function recordFileDownload(fileId, userId) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(fileId);
    const normalizedUserId = userId ? normalizeId(userId) : null;
    
    // Increment download count
    await db.collection("files").updateOne(
      { _id: objectId },
      { $inc: { downloads: 1 } }
    );
    
    // If the file is part of a dataset, also record download there
    const file = await getFileById(objectId);
    if (file && file.datasetId) {
      // Import is within function to avoid circular dependencies
      const { recordDatasetDownload } = await import('./dataset');
      await recordDatasetDownload(file.datasetId, normalizedUserId);
    }
    
    // Record download event
    if (normalizedUserId) {
      await db.collection("fileDownloads").insertOne({
        fileId: objectId,
        userId: normalizedUserId,
        downloadDate: new Date()
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error recording file download:", error);
    return false;
  }
}

// Get file stats for a dataset
export async function getFileStats(datasetId) {
  try {
    const { db } = await connectToDatabase();
    const normalizedDatasetId = normalizeId(datasetId);
    
    // Get file counts by type
    const fileTypeStats = await db.collection("files").aggregate([
      { $match: { datasetId: normalizedDatasetId } },
      { $group: { 
        _id: "$fileType", 
        count: { $sum: 1 },
        totalSize: { $sum: "$size" }
      }},
      { $sort: { count: -1 } }
    ]).toArray();
    
    // Get total file count and size
    const totalStats = await db.collection("files").aggregate([
      { $match: { datasetId: normalizedDatasetId } },
      { $group: { 
        _id: null, 
        count: { $sum: 1 },
        totalSize: { $sum: "$size" }
      }}
    ]).toArray();
    
    const total = totalStats.length > 0 ? totalStats[0] : { count: 0, totalSize: 0 };
    
    return {
      total: {
        count: total.count,
        size: total.totalSize
      },
      byType: fileTypeStats.map(stat => ({
        fileType: stat._id,
        count: stat.count,
        size: stat.totalSize
      }))
    };
  } catch (error) {
    console.error("Error getting file stats:", error);
    return {
      total: { count: 0, size: 0 },
      byType: []
    };
  }
} 