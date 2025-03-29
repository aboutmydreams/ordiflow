// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import React, { useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "./networkConfig";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Button, Card, Flex, Spinner } from "@radix-ui/themes";
import { getAllowlistedKeyServers, SealClient } from "@mysten/seal";

export type Data = {
  status: string;
  blobId: string;
  endEpoch: string;
  suiRefType: string;
  suiRef: string;
  suiBaseUrl: string;
  blobUrl: string;
  suiUrl: string;
  isImage: string;
};

interface WalrusUploadProps {
  recipientAllowlist: string;
  cap_id: string;
  moduleName: string;
}

export function WalrusUpload({ recipientAllowlist, cap_id, moduleName }: WalrusUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<Data | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const SUI_VIEW_TX_URL = `https://suiscan.xyz/testnet/tx`;
  const SUI_VIEW_OBJECT_URL = `https://suiscan.xyz/testnet/object`;

  const NUM_EPOCH = 1;
  const packageId = useNetworkVariable("packageId");
  const suiClient = useSuiClient();
  const client = new SealClient({
    suiClient,
    serverObjectIds: getAllowlistedKeyServers("testnet"),
  });
  function getAggregatorUrl(path: string): string {
    const cleanPath = path.replace(/^\/+/, '').replace(/^v1\//, '');
    return `/aggregator/v1/${cleanPath}`;
  }
  
  function getPublisherUrl(path: string): string {
    const cleanPath = path.replace(/^\/+/, '').replace(/^v1\//, '');
    return `/publisher/v1/${cleanPath}`;
  }

  const { mutate: signAndExecute } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showEffects: true,
        },
      }),
  });

  const handleFileChange = (event: any) => {
    // Max 10 MiB size
    if (event.target.files[0].size > 10 * 1024 * 1024) {
      alert("File size must be less than 10 MiB");
      return;
    }
    setFile(event.target.files[0]);
    setInfo(null);
  };

  const handleSubmit = () => {
    setIsUploading(true);
    if (file) {
      const reader = new FileReader();
      reader.onload = async function (event) {
        if (event.target && event.target.result) {
          const result = event.target.result;
          if (result instanceof ArrayBuffer) {
            const { encryptedObject: encryptedBytes } = await client.encrypt({
              threshold: 2,
              packageId,
              id: recipientAllowlist,
              data: new Uint8Array(result),
            });
            const storageInfo = await storeBlob(encryptedBytes);
            displayUpload(storageInfo.info, file.type);
            setIsUploading(false);
          } else {
            console.error("Unexpected result type:", typeof result);
            setIsUploading(false);
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      console.error("No file selected");
    }
  };

  const displayUpload = (storage_info: any, media_type: any) => {
    let info;
    if ("alreadyCertified" in storage_info) {
      info = {
        status: "Already certified",
        blobId: storage_info.alreadyCertified.blobId,
        endEpoch: storage_info.alreadyCertified.endEpoch,
        suiRefType: "Previous Sui Certified Event",
        suiRef: storage_info.alreadyCertified.event.txDigest,
        suiBaseUrl: SUI_VIEW_TX_URL,
        blobUrl: getAggregatorUrl(`/v1/blobs/${storage_info.alreadyCertified.blobId}`),
        suiUrl: `${SUI_VIEW_OBJECT_URL}/${storage_info.alreadyCertified.event.txDigest}`,
        isImage: media_type.startsWith("image"),
      };
    } else if ("newlyCreated" in storage_info) {
      info = {
        status: "Newly created",
        blobId: storage_info.newlyCreated.blobObject.blobId,
        endEpoch: storage_info.newlyCreated.blobObject.storage.endEpoch,
        suiRefType: "Associated Sui Object",
        suiRef: storage_info.newlyCreated.blobObject.id,
        suiBaseUrl: SUI_VIEW_OBJECT_URL,
        blobUrl: getAggregatorUrl(`/v1/blobs/${storage_info.newlyCreated.blobObject.blobId}`),
        suiUrl: `${SUI_VIEW_OBJECT_URL}/${storage_info.newlyCreated.blobObject.id}`,
        isImage: media_type.startsWith("image"),
      };
    } else {
      throw Error("Unhandled successful response!");
    }
    setInfo(info);
  };

  const storeBlob = (encryptedData: Uint8Array) => {
    return fetch(`${getPublisherUrl(`/v1/blobs?epochs=${NUM_EPOCH}`)}`, {
      method: "PUT",
      body: encryptedData,
    }).then((response) => {
      if (response.status === 200) {
        return response.json().then((info) => {
          return { info };
        });
      } else {
        throw new Error("Something went wrong when storing the blob!");
      }
    });
  };

  async function handlePublish(wl_id: string, cap_id: string, moduleName: string) {
    const tx = new Transaction();
     tx.moveCall({
      target: `${packageId}::${moduleName}::publish`,
      arguments: [
        tx.object(wl_id),
        tx.object(cap_id),
        tx.pure.string(info!.blobUrl),
      ],
    });

    tx.setGasBudget(10000000);
    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: async (result) => {
          console.log("res", result);
          alert("File published successfully");
        },
      },
    );
  }

  return (
    <Card>
      <Flex direction="column" gap="2" align="start">
        <input 
          type="file" 
          onChange={handleFileChange}
          aria-label="Choose file to upload"
        />
        <p>File size must be less than 10 MiB</p>
        <Button
          onClick={() => {
            handleSubmit();
          }} disabled={file === null}
        >
          First: Encrypt and upload to walrus 
        </Button>
        {isUploading && (
          <div role="status">
            <Spinner className="animate-spin" aria-label="Uploading" />
            <span>Uploading</span>
          </div>
        )}
  
        {info && file && (
          <div id="uploaded-blobs" role="region" aria-label="Upload details">
            <dl>
              <dt>Status:</dt>
              <dd>{info.status}</dd>
              <dt>Stored until epoch:</dt>
              <dd>{info.endEpoch}</dd>
              <dd>
                <a 
                  href={info.blobUrl} 
                  style={{ textDecoration: "underline" }}
                  download
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(info.blobUrl, '_blank', 'noopener,noreferrer');
                  }}
                  aria-label="Download encrypted blob"
                >
                  Encrypted blob
                </a>
              </dd>
              <dd>
                <a
                  href={info.suiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "underline" }}
                  aria-label="View Sui object details"
                >
                  Sui Object
                </a>
              </dd>
            </dl>
            </div>
        )}
        <Button
          onClick={() => {
            handlePublish(recipientAllowlist, cap_id, moduleName);
          }}
          disabled={!info || !file || recipientAllowlist === ""}
          aria-label="Encrypt and upload file"
        >
          Second: Associate to Sui object
        </Button>
        <p>e.g. the allowlist object or the service object for subscription</p>
      </Flex>
    </Card>
  );
}

export default WalrusUpload;
