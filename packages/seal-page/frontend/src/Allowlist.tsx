// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Card, Flex } from "@radix-ui/themes";
import { useNetworkVariable } from "./networkConfig";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useParams } from "react-router-dom";
import { isValidSuiAddress } from "@mysten/sui/utils";

export interface Allowlist {
  id: string;
  name: string;
  list: string[];
}

interface AllowlistProps {
  setRecipientAllowlist: React.Dispatch<React.SetStateAction<string>>;
  setCapId: React.Dispatch<React.SetStateAction<string>>;
}

export function Allowlist({ setRecipientAllowlist, setCapId }: AllowlistProps) {
  const packageId = useNetworkVariable("packageId");
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const [allowlist, setAllowlist] = useState<Allowlist>();
  const { id } = useParams();
  const [capId, setInnerCapId] = useState<string>();
  async function getAllowlist() {
    // load all caps
    const res = await suiClient.getOwnedObjects({
      owner: currentAccount?.address!,
      options: {
        showContent: true,
        showType: true,
      },
      filter: {
        StructType: `${packageId}::allowlist::Cap`,
      },
    });
    
    // find the cap for the given allowlist id
    const capId = res.data
    .map((obj) => {
      const fields = (obj!.data!.content as { fields: any }).fields;
      return {
        id: fields?.id.id,
        allowlist_id: fields?.allowlist_id,
      };
    })
    .filter((item) => item.allowlist_id === id)
    .map((item) => item.id) as string[];
    setCapId(capId[0]);
    setInnerCapId(capId[0]);

    // load the allowlist for the given id
    const allowlist = await suiClient.getObject({
      id: id!,
      options: { showContent: true },
    });
    const fields =
      (allowlist.data?.content as { fields: any })?.fields || {};
    setAllowlist({
      id: id!,
      name: fields.name,
      list: fields.list,
    });
    setRecipientAllowlist(id!);
  }

  useEffect(() => {
    getAllowlist();
    const interval = setInterval(() => {
      getAllowlist();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

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

  const addItem = (newAddressToAdd: string, wl_id: string, cap_id: string) => {
    if (newAddressToAdd.trim() !== "") {
      if (!isValidSuiAddress(newAddressToAdd.trim())) {
        alert("Invalid address");
        return;
      }
      const tx = new Transaction();
      tx.moveCall({
        arguments: [
          tx.object(wl_id),
          tx.object(cap_id),
          tx.pure.address(newAddressToAdd.trim()),
        ],
        target: `${packageId}::allowlist::add`,
      });
      tx.setGasBudget(10000000);

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            console.log("res", result);
          },
        },
      );
      getAllowlist();
    }
  };

  const removeItem = (addressToRemove: string, wl_id: string, cap_id: string) => {
    if (addressToRemove.trim() !== "") {
      const tx = new Transaction();
      tx.moveCall({
        arguments: [
          tx.object(wl_id),
          tx.object(cap_id),
          tx.pure.address(addressToRemove.trim()),
        ],
        target: `${packageId}::allowlist::remove`,
      });
      tx.setGasBudget(10000000);

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            console.log("res", result);
          },
        },
      );
      getAllowlist();
    }
  };


  return (
    <Flex direction="column" gap="2" justify="start">
      <Card key={`${allowlist?.id}`}>
        <h3> Link to share with users: 
          <a href={`${window.location.origin}/allowlist-example/view/allowlist/${allowlist?.id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
            here
          </a> 
        </h3>
        <h3>Allowlist: {allowlist?.name} - {allowlist?.id}</h3>

        <Flex direction="row" gap="2">
          <input placeholder="Add new address" />
          <Button
            onClick={(e) => {
              const input = e.currentTarget
                .previousElementSibling as HTMLInputElement;
              addItem(input.value, id!, capId!);
              input.value = "";
            }}
          >
            Add
          </Button>
        </Flex>

        <h4>Allowed User Addresses:</h4>
        {Array.isArray(allowlist?.list) && allowlist?.list.length > 0 ? (
          <ul>
            {allowlist?.list.map((listItem, itemIndex) => (
              <li key={itemIndex}>
                <Flex direction="row" gap="2">
                  <p>{listItem}</p>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(listItem, id!, capId!);
                    }}
                  >
                    <X />
                  </Button>
                </Flex>
              </li>
            ))}
          </ul>
        ) : (
          <p>No user in this allowlist.</p>
          )}
      </Card>
    </Flex>
  );
}
