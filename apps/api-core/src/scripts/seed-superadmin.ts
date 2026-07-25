import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

// Load environment variables from project root and current directory
const cwd = process.cwd();
const maybeRoot = path.resolve(cwd, '../..');
dotenv.config({ path: path.join(maybeRoot, '.env') });
dotenv.config({ path: path.join(maybeRoot, '.env.local') });
dotenv.config({ path: path.join(cwd, '.env') });
dotenv.config({ path: path.join(cwd, '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not set. Set it in the environment or .env file.');
}

const SUPER_ADMIN_EMAIL = 'superadmin@vartulaa.com';
const SUPER_ADMIN_PASSWORD = 'Vartulaa@123';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, trim: true },
    role: { type: String, enum: ['user', 'agent', 'admin', 'super_admin'], default: 'agent' },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true },
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

async function main() {
  console.warn(`!!! This will drop the database at ${MONGODB_URI} and create only one superadmin user. !!!`);

  await mongoose.connect(MONGODB_URI);
  const connection = mongoose.connection;

  // Drop the entire database
  console.log('Dropping database...');
  await connection.dropDatabase();
  console.log('Database dropped.');

  // Register the User model on the connected default connection
  const User = mongoose.model('User', userSchema);

  // Create the superadmin user
  const user = new User({
    email: SUPER_ADMIN_EMAIL,
    password: SUPER_ADMIN_PASSWORD,
    name: 'Super Admin',
    role: 'super_admin',
    isActive: true,
  });

  await user.save();

  console.log(`Superadmin user created: ${SUPER_ADMIN_EMAIL}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
