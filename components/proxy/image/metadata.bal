// ------------------------------------------------------------------------
//
// Copyright 2019 WSO2, Inc. (http://wso2.com)
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License
//
// ------------------------------------------------------------------------

import ballerina/filepath;
import ballerina/internal;
import ballerina/io;
import ballerina/log;
import ballerina/transactions;
import cellery_hub/database;

# Extract the metadata for the cell iamge file layer.
#
# + cellImageBytes - Cell Image Zip bytes
# + return - metadata or an error
public function saveMetadataFromImage(string userId, byte[] cellImageBytes) returns error? {
    var transactionId = transactions:getCurrentTransactionId();
    var extractedCellImageDir = filepath:build("/", "tmp", "cell-image-" + transactionId);

    json metadataJson;
    if (extractedCellImageDir is error) {
        error err = error("failed to resolve extract location due to " + extractedCellImageDir.reason());
        return err;
    } else {
        // Uncompressing the received Cell Image Bytes
        internal:Path zipDest = new(extractedCellImageDir);
        var zipDestDirCreateResult = zipDest.createDirectory();
        if (zipDestDirCreateResult is error) {
            error err = error("failed to create temp directory due to " + zipDestDirCreateResult.reason());
            return err;
        }
        var decompressResult = internal:decompressFromByteArray(cellImageBytes, zipDest);
        log:printDebug(io:sprintf("Extracted Cell image at %s for transaction %s", extractedCellImageDir,
            transactionId));

        if (decompressResult is error) {
            error err = error("failed to extract Cell Image due to " + decompressResult.reason());
            return err;
        } else {
            // Reading the metadata from the extracted Cell Image
            var cellImageMetadataFile = filepath:build(extractedCellImageDir, "artifacts", "cellery", "metadata.json");
            if (cellImageMetadataFile is string) {
                io:ReadableByteChannel metadataRbc = io:openReadableFile(untaint cellImageMetadataFile);
                io:ReadableCharacterChannel metadataRch = new(metadataRbc, "UTF8");
                var parsedMetadata = metadataRch.readJson();
                log:printDebug("Read Cell image metadata for transaction " + transactionId);

                if (parsedMetadata is json) {
                    var extracedCellImageDeleteResult = zipDest.delete();
                    if (extracedCellImageDeleteResult is error) {
                        log:printError(
                            io:sprintf("Failed to cleanup Cell Image extracted in directory %s for transaction %s",
                                extractedCellImageDir, transactionId),
                            err = extracedCellImageDeleteResult
                        );
                    } else {
                        log:printDebug("Cleaned up extracted Cell Image for transaction " + transactionId);
                    }
                    metadataJson = parsedMetadata;
                } else {
                    error err = error("failed to parse metadata.json due to " + parsedMetadata.reason());
                    var extracedCellImageDeleteResult = zipDest.delete();
                    if (extracedCellImageDeleteResult is error) {
                        log:printError(
                            io:sprintf("Failed to cleanup Cell Image extracted in directory %s for transaction %s",
                                extractedCellImageDir, transactionId),
                            err = extracedCellImageDeleteResult
                        );
                    } else {
                        log:printDebug("Cleaned up extracted Cell Image for transaction " + transactionId);
                    }
                    return err;
                }
            } else {
                error err = error("failed to resolve metadata.json file due to " + cellImageMetadataFile.reason());
                var extracedCellImageDeleteResult = zipDest.delete();
                if (extracedCellImageDeleteResult is error) {
                    log:printError(
                        io:sprintf("Failed to cleanup Cell Image extracted in directory %s for transaction %s",
                            extractedCellImageDir, transactionId),
                        err = extracedCellImageDeleteResult
                    );
                } else {
                    log:printDebug("Cleaned up extracted Cell Image for transaction " + transactionId);
                }
                return err;
            }
        }
    }

    var cellImage = buildCellImage(metadataJson);
    if (cellImage is database:CellImage) {
        var saveResult = database:saveCellImage(userId, cellImage);
        if (saveResult is error) {
            log:printError(io:sprintf("Failed to store Cell image %s/%s:%s", cellImage.org, cellImage.name,
                    cellImage.ver),
                err = saveResult);
            return saveResult;
        }
    } else {
        log:printError("Failed to build Cell Image data from metadata", err = cellImage);
        return cellImage;
    }
}
