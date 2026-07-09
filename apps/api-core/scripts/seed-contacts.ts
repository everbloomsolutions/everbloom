/**
 * Script to seed test contact data
 */

import mongoose from 'mongoose';
import { Contact } from '../src/modules/content/contact.model';
import { config } from '../src/core/config';

const seedContacts = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    if (!config.mongodbUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB');

    // Check if contacts already exist
    const existingCount = await Contact.countDocuments();
    if (existingCount > 0) {
      console.log(`\n⚠️  Found ${existingCount} existing contacts.`);
      console.log('   Use --force flag to delete and recreate, or skip seeding.');
      await mongoose.disconnect();
      return;
    }

    // Create test contacts
    const testContacts = [
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        subject: 'Inquiry about scrap collection services',
        message: 'I would like to know more about your scrap collection services. How do I schedule a pickup?',
        status: 'new' as const,
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        subject: 'Business partnership inquiry',
        message: 'We are a local business interested in partnering with Everbloom for onestop recycling solution services.',
        status: 'read' as const,
      },
      {
        name: 'Mike Johnson',
        email: 'mike.j@example.com',
        subject: 'Question about Green Coins rewards',
        message: 'How do the Green Coins rewards work? Can I redeem them for cash?',
        status: 'new' as const,
      },
      {
        name: 'Sarah Williams',
        email: 'sarah.w@example.com',
        subject: 'Large-scale scrap pickup needed',
        message: 'We have a large amount of e-waste and metal scrap. Can you provide a quote for pickup?',
        status: 'replied' as const,
      },
      {
        name: 'David Brown',
        email: 'david.brown@example.com',
        subject: 'General information request',
        message: 'I would like to learn more about your zero-waste initiatives and how I can participate.',
        status: 'archived' as const,
      },
    ];

    console.log('\n📝 Creating test contacts...');
    const created = await Contact.insertMany(testContacts);
    console.log(`✅ Created ${created.length} test contacts`);

    // Display created contacts
    console.log('\n📋 Created Contacts:');
    created.forEach((contact, index) => {
      console.log(`\n${index + 1}. ${contact.name} (${contact.email})`);
      console.log(`   Subject: ${contact.subject}`);
      console.log(`   Status: ${contact.status}`);
    });

    // Disconnect
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('\n💡 You can now view these contacts in the admin panel Inquiries page.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Run the script
seedContacts();

