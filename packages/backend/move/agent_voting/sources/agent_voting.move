/// Module: agent_voting
module agent_voting::agent_voting {
    use std::string::String;
    use sui::dynamic_field;
    use sui::event;

    // ===== 数据结构定义 =====

    /// 智能体NFT（可转移）
    public struct Agent has key, store {
        id: sui::object::UID,
        blob_id: String,
        prompt: String
    }

    /// 投票组NFT（可转移）
    public struct AgentGroup has key, store {
        id: sui::object::UID,
        agents: vector<sui::object::ID>,
        creator: address
    }

    /// 内容NFT（不可转移）
    public struct Content has key, store {
        id: sui::object::UID,
        content_hash: vector<u8>,
        description: String,
        group_id: sui::object::ID,
        approvals: u64,
        rejections: u64
    }

    /// 投票事件NFT（不可转移）
    public struct VoteEvent has key, store {
        id: sui::object::UID,
        agent_id: sui::object::ID,
        content_id: sui::object::ID,
        vote: bool,
        description: String
    }

    // ===== 事件定义 =====

    public struct AgentCreated has copy, drop {
        agent_id: sui::object::ID
    }

    public struct GroupCreated has copy, drop {
        group_id: sui::object::ID
    }

    public struct ContentCreated has copy, drop {
        content_id: sui::object::ID
    }

    public struct VoteRecorded has copy, drop {
        content_id: sui::object::ID,
        is_approval: bool
    }

    // ===== 错误码 =====
    const EAgentNotInGroup: u64 = 0;
    const EDuplicateVote: u64 = 1;

    // ===== 核心逻辑 =====

    /// 功能1：创建智能体NFT
    public entry fun create_agent(
        blob_id: String,
        prompt: String,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let agent = Agent {
            id: sui::object::new(ctx),
            blob_id,
            prompt
        };
        event::emit(
            AgentCreated {
                agent_id: sui::object::id(&agent)
            }
        );
        sui::transfer::transfer(agent, sui::tx_context::sender(ctx));
    }

    /// 功能2：创建投票组NFT
    public entry fun create_agent_group(
        agents: vector<sui::object::ID>,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let group = AgentGroup {
            id: sui::object::new(ctx),
            agents,
            creator: sui::tx_context::sender(ctx)
        };
        event::emit(
            GroupCreated {
                group_id: sui::object::id(&group)
            }
        );
        sui::transfer::transfer(group, sui::tx_context::sender(ctx));
    }

    /// 功能3：创建内容提案
    public entry fun create_content(
        content_hash: vector<u8>,
        description: String,
        group_id: sui::object::ID,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let content = Content {
            id: sui::object::new(ctx),
            content_hash,
            description,
            group_id,
            approvals: 0,
            rejections: 0
        };
        event::emit(
            ContentCreated {
                content_id: sui::object::id(&content)
            }
        );
        sui::transfer::public_freeze_object(content);
    }

    /// 功能4：执行投票
    public entry fun vote(
        agent: &mut Agent,
        group: &AgentGroup,
        content: &mut Content,
        vote: bool,
        _vote_des: String,
        _signature: vector<u8>,
        ctx: &mut sui::tx_context::TxContext
    ) {
        // 验证Agent属于投票组
        assert!(
            vector::contains(
                &group.agents,
                &sui::object::id(agent)
            ),
            EAgentNotInGroup
        );

        // 防止重复投票（修正动态字段调用）
        let agent_id = sui::object::id(agent);
        assert!(
            !sui::dynamic_field::exists<address, bool>(// 使用address作为字段键类型
                &content.id,
                sui::tx_context::sender(ctx)
            ),
            EDuplicateVote
        );

        // 更新投票计数（修复if语法）
        if (vote) {
            content.approvals = content.approvals + 1;
        } else {
            content.rejections = content.rejections + 1;
        };

        // 生成投票事件NFT（修复变量声明）
        let vote_event = VoteEvent {
            id: sui::object::new(ctx),
            agent_id: agent_id,
            content_id: sui::object::id(content),
            vote,
            description: _vote_des
        };
        sui::transfer::public_freeze_object(vote_event);

        // 记录投票记录（修正动态字段参数）
        dynamic_field::add<sui::object::ID, bool>(&mut content.id, agent_id, true);
        event::emit(
            VoteRecorded {
                content_id: sui::object::id(content),
                is_approval: vote
            }
        );
    }
}
