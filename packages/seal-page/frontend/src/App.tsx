// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Button, Card, Container, Flex, Grid } from "@radix-ui/themes";
import { CreateAllowlist } from "./CreateAllowlist";
import { Allowlist } from "./Allowlist";
import WalrusUpload from "./WalrusUpload";
import { useState } from "react";
import { CreateService } from "./CreateService";
import FeedsToSubscribe from "./FeedsToSubscribe";
import { Service } from "./Service";
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AllAllowlist } from './AllAllowlist';
import { AllServices } from './AllServices';
import Feeds from './Feeds';

function LandingPage() {
  return (
    <Grid columns="2" gap="4">
      <Card>
        <Flex direction="column" gap="2" align="center">
          <h2>Allowlist Example</h2>
          <p>This example shows how a creator can define an allowlist based access. The creator first creates an allowlist and can add or remove users in the list. Creator can then add encrypted files to the allowlist. Only users in the allowlist has access to decrypt the files.
          </p>
          <Link to="/allowlist-example">
            <Button size="3">Try it</Button>
          </Link>
        </Flex>
      </Card>
      <Card>
        <Flex direction="column" gap="2" align="center">
          <h2>Subscription Example</h2>
          <p>This example shows how a creator can define a subscription based access to a service. The creator defines subcription fee and how long the subscription is valid for (TTL). Creator can then add encrypted files to the service. Only uses who had purchased a subscription NFT with the fee has access to decrypt the files, and only if the subscription is unexpired, that is, the subscription NFT creation timestamp + TTL is larger than current clock time.</p>
          <Link to="/subscription-example">
            <Button size="3">Try it</Button>
          </Link>
        </Flex>
      </Card>
    </Grid>
  );
}

function App() {
  const currentAccount = useCurrentAccount();
  const [recipientAllowlist, setRecipientAllowlist] = useState<string>("");
  const [capId, setCapId] = useState<string>("");
  return (
    <Container>
      <Flex
        position="sticky"
        px="4"
        py="2"
        justify="between"
      >
        <h1 className="text-4xl font-bold m-4">Seal Example Apps</h1>
        {/* <p>TODO: add seal logo</p> */}
       <Box>
          <ConnectButton />
        </Box>
      </Flex>
      <Card>
        <p>1. Code: <a href="https://github.com/MystenLabs/seal-example">https://github.com/MystenLabs/seal-example</a></p>
        <p>2. These examples are for Testnet only. Make sure you wallet is set to Testnet and has some balance (request from faucet.sui.io).</p>
        <p>3. Blobs are only stored on Walrus for 1 epoch by default, older files cannot be retrieved even if you have access.</p>
      </Card>
      {currentAccount ? (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/allowlist-example/*" element={
            <Routes>
              <Route path="/" element={<CreateAllowlist />} />
              <Route path="/admin/allowlist/:id" element={
                <div>
                  <Allowlist setRecipientAllowlist={setRecipientAllowlist} setCapId={setCapId}/>
                  <WalrusUpload recipientAllowlist={recipientAllowlist} cap_id={capId} moduleName="allowlist"/>
                </div>
              } />
              <Route path="/admin/allowlists" element={<AllAllowlist />} />
              <Route path="/view/allowlist/:id" element={<Feeds suiAddress={currentAccount.address}/>} />
            </Routes>
          } />
          <Route path="/subscription-example/*" element={
            <Routes>
              <Route path="/" element={<CreateService />} />
              <Route path="/admin/service/:id" element={
                <div>
                  <Service setRecipientAllowlist={setRecipientAllowlist} setCapId={setCapId}/>
                  <WalrusUpload recipientAllowlist={recipientAllowlist} cap_id={capId} moduleName="subscription"/>
                </div>
              } />
              <Route path="/admin/services" element={<AllServices />} />
              <Route path="/view/service/:id" element={<FeedsToSubscribe suiAddress={currentAccount.address}/>} />
            </Routes>
          } />
        </Routes>
      </BrowserRouter>
      ) : (
        <p>Please connect your wallet to continue</p>
      )}
    </Container>
  );
}

export default App;
