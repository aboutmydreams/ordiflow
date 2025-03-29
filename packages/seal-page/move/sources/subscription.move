// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Based on the subscription pattern.
// TODO: document and add tests

module walrus::subscription;

use sui::dynamic_field as df;
use std::string::String;
use sui::sui::SUI;
use sui::clock::Clock;
use sui::coin::Coin;

const EInvalidCap : u64 = 0;
const EInvalidFee : u64 = 1;
const ENoAccess : u64 = 2;

public struct Service has key {
    id: UID,
    fee: u64,
    ttl: u64,
    owner: address,
    name: String,
}

public struct Subscription has key {
    id: UID,
    service_id: ID,
    created_at: u64,
}

public struct Cap has key {
    id: UID,
    service_id: ID,
}

public struct EncryptedObject has key, store {
    id: UID,
    blob_id: String,
}

//////////////////////////////////////////
/////// Simple a service

/// Create a service.
/// The associated key-ids are [pkg id]::[service id][nonce] for any nonce (thus
/// many key-ids can be created for the same service).
public fun create_service(fee: u64, ttl: u64, name: String, ctx: &mut TxContext): Cap {
   let service = Service {
        id: object::new(ctx),
        fee: fee,
        ttl: ttl,
        owner: ctx.sender(),
        name: name,
    };
    let cap = Cap {
        id: object::new(ctx),
        service_id: object::id(&service),
    };
    transfer::share_object(service);
    cap
}

// convenience function to create a service and share it (simpler ptb for cli)
entry fun create_service_entry(fee: u64, ttl: u64, name: String, ctx: &mut TxContext) {
    transfer::transfer(create_service(fee, ttl, name, ctx), ctx.sender());
}

public fun subscribe(fee: Coin<SUI>, service: &Service, c: &Clock, ctx: &mut TxContext): Subscription {
    assert!(fee.value() == service.fee, EInvalidFee);
    transfer::public_transfer(fee, service.owner);
    Subscription {
        id: object::new(ctx),
        service_id: object::id(service),
        created_at: c.timestamp_ms(),
    }
}

public fun transfer(sub: Subscription, to: address) {
    transfer::transfer(sub, to);
}

#[test_only]
public fun destroy_for_testing(ser: Service, sub: Subscription) {
    let Service { id, .. } = ser;
    object::delete(id);
    let Subscription { id, .. } = sub;
    object::delete(id);
}

//////////////////////////////////////////////////////////
/// Access control
/// key format: [pkg id]::[service id][random nonce]

/// All allowlisted addresses can access all IDs with the prefix of the allowlist
fun approve_internal(id: vector<u8>, sub: &Subscription, service: &Service, c: &Clock): bool {
    if (object::id(service) != sub.service_id) {
        return false
    };
    if (c.timestamp_ms() > sub.created_at + service.ttl) {
        return false
    };

    // Check if the id has the right prefix
    let namespace = service.id.to_bytes();
    let mut i = 0;
    if (namespace.length() > id.length()) {
        return false
    };
    while (i < namespace.length()) {
        if (namespace[i] != id[i]) {
            return false
        };
        i = i + 1;
    };
    true
}

entry fun seal_approve(id: vector<u8>, sub: &Subscription, service: &Service, c: &Clock) {
    assert!(approve_internal(id, sub, service, c), ENoAccess);
}

/// Encapsulate a blob into a Sui object and attach it to the Subscription
public fun publish(service: &mut Service, cap: &Cap, blob_id: String, ctx: &mut TxContext) {
    assert!(cap.service_id == object::id(service), EInvalidCap);
    let obj = EncryptedObject {
        id: object::new(ctx),
        blob_id: blob_id,
    };
    df::add(&mut service.id, blob_id, obj);
}
