// Copyright (c) Konstantin Komelin and other contributors
// SPDX-License-Identifier: MIT

#[test_only]
module content_moderation::content_moderation_tests;

use content_moderation::content_moderation;
use sui::random::{Self, Random};
use sui::test_scenario as ts;
use sui::test_utils;

#[test]
/// Tests successful run of the set_content_moderation() and reset_content_moderation() functions.
fun test_content_moderation() {
    let user1 = @0x0;
    let bob = b"Bob".to_string();
    let alice = b"Alice".to_string();
    let empty = b"".to_string();
    let mut ts = ts::begin(user1);

    // Run the module initializer.
    // The curly braces are used to explicitly scope the transaction.
    {
        content_moderation::init_for_testing(ts.ctx());
    };

    // @todo: Test Object Display.

    // Setup randomness.
    random::create_for_testing(ts.ctx());
    ts.next_tx(user1);
    let mut random_state: Random = ts.take_shared();
    random_state.update_randomness_state_for_testing(
        0,
        x"1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F",
        ts.ctx(),
    );

    ts.next_tx(user1);
    let mut g = content_moderation::new_for_testing(bob, ts.ctx());
    assert!(content_moderation::name(&g) == bob, 0);
    assert!(content_moderation::emoji(&g) == content_moderation::no_emoji_index(), 1);

    ts.next_tx(user1);
    content_moderation::set_content_moderation(&mut g, alice, &random_state, ts.ctx());
    assert!(content_moderation::name(&g) == alice, 2);
    assert!(
        content_moderation::emoji(&g) >= content_moderation::min_emoji_index() && content_moderation::emoji(&g) <= content_moderation::max_emoji_index(),
        3,
    );

    ts.next_tx(user1);
    content_moderation::reset_content_moderation(&mut g);
    assert!(content_moderation::name(&g) == empty, 4);
    assert!(content_moderation::emoji(&g) == content_moderation::no_emoji_index(), 5);

    test_utils::destroy(g);
    ts::return_shared(random_state);
    ts.end();
}

#[test]
#[expected_failure(abort_code = content_moderation::EEmptyName)]
/// Tests failed run of the set_content_moderation() in case of the empty name.
fun test_set_content_moderation_fail() {
    let user1 = @0x0;
    let bob = b"Bob".to_string();
    let empty = b"".to_string();
    let mut ts = ts::begin(user1);

    // Run the module initializer.
    // The curly braces are used to explicitly scope the transaction.
    {
        content_moderation::init_for_testing(ts.ctx());
    };

    // Setup randomness.
    random::create_for_testing(ts.ctx());
    ts.next_tx(user1);
    let mut random_state: Random = ts.take_shared();
    random_state.update_randomness_state_for_testing(
        0,
        x"1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F",
        ts.ctx(),
    );

    ts.next_tx(user1);
    let mut g = content_moderation::new_for_testing(bob, ts.ctx());
    assert!(content_moderation::name(&g) == bob, 0);
    assert!(content_moderation::emoji(&g) == content_moderation::no_emoji_index(), 1);

    ts.next_tx(user1);
    // Should fail.
    content_moderation::set_content_moderation(&mut g, empty, &random_state, ts.ctx());

    test_utils::destroy(g);
    ts::return_shared(random_state);
    ts.end();
}
