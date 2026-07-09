#!/usr/bin/env node

/**
 * Create agent user for testing
 * Email: agent@everbloom.com
 * Password: Agent@123
 *
 * This script ensures the agent user exists, creating it if it doesn't.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../src/modules/user/user.model';

// Load environment variables
const rootEnvPath = path.resolve(__dirname, '../../.env.development');
const altRootEnvPath = path.resolve(__dirname, '../../.env');
const backendEnvPath = path.resolve(__dirname, '../.env');

// Try to load root .env first
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: altRootEnvPath });
dotenv.config({ path: backendEnvPath });

const AGENT_EMAIL = 'agent@everbloom.com';
const AGENT_PASSWORD = 'Agent@123';
const AGENT_NAME = 'Agent User';

async function createAgentUser() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/everbloom';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if agent user already exists
    const existingAgent = await User.findOne({ email: AGENT_EMAIL.toLowerCase() });

    if (existingAgent) {
      console.log(`✅ Agent user already exists: ${AGENT_EMAIL}`);
      console.log(`   Role: ${existingAgent.role}`);
      console.log(`   Active: ${existingAgent.isActive}`);
      console.log(`   ID: ${existingAgent._id}`);

      // Update password if needed
      if (existingAgent.password) {
        const bcrypt = await import('bcryptjs');
        const isMatch = await bcrypt.default.compare(AGENT_PASSWORD, existingAgent.password);
        if (!isMatch) {
          console.log('⚠️  Password does not match. Updating password...');
          existingAgent.password = AGENT_PASSWORD;
          await existingAgent.save();
          console.log('✅ Password updated');
        } else {
          console.log('✅ Password is correct');
        }
      } else {
        console.log('⚠️  No password set. Setting password...');
        existingAgent.password = AGENT_PASSWORD;
        await existingAgent.save();
        console.log('✅ Password set');
      }

      // Ensure user is agent and active
      if (existingAgent.role !== 'agent') {
        console.log(`⚠️  User role is "${existingAgent.role}", updating to "agent"...`);
        existingAgent.role = 'agent';
        await existingAgent.save();
        console.log('✅ Role updated to agent');
      }

      if (!existingAgent.isActive) {
        console.log('⚠️  User is inactive. Activating...');
        existingAgent.isActive = true;
        await existingAgent.save();
        console.log('✅ User activated');
      }

      await mongoose.disconnect();
      console.log('\n✅ Agent user is ready for use!');
      console.log(`   Email: ${AGENT_EMAIL}`);
      console.log(`   Password: ${AGENT_PASSWORD}`);
      return;
    }

    // Create new agent user
    console.log(`\n📝 Creating agent user: ${AGENT_EMAIL}`);

    const agentUser = new User({
      email: AGENT_EMAIL.toLowerCase(),
      password: AGENT_PASSWORD,
      name: AGENT_NAME,
      role: 'agent',
      isActive: true,
    });

    await agentUser.save();

    console.log('✅ Agent user created successfully!');
    console.log(`   Email: ${AGENT_EMAIL}`);
    console.log(`   Password: ${AGENT_PASSWORD}`);
    console.log(`   Role: agent`);
    console.log(`   ID: ${agentUser._id}`);

    await mongoose.disconnect();
    console.log('\n✅ Agent user is ready for use!');

  } catch (error) {
    console.error('❌ Error creating agent user:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

// Run the script
createAgentUser();
