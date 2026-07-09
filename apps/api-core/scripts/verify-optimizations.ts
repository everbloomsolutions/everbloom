/**
 * Verification script for MongoDB optimizations
 *
 * This script verifies:
 * 1. .lean() queries return expected results with populate
 * 2. Soft-delete queries properly exclude/include deleted items
 * 3. Aggregation results match previous implementation
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Project } from '../src/modules/project/project.model';
import { Location as _Location } from '../src/modules/location/location.model';
import { AnalyticsEvent } from '../src/modules/analytics/analytics.model';
import { AuditLog as _AuditLog } from '../src/modules/audit/audit.model';
import { User as _User } from '../src/modules/user/user.model'; // Import User model for populate
import { excludeDeleted, includeDeleted, buildDateRange, combineQueries } from '../src/core/utils/queryBuilder';
import { config } from '../src/core/config';

// Load environment variables (check both locations)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Note: User model is registered automatically when imported
// The import statement above executes mongoose.model('User', userSchema) which registers it

interface VerificationResult {
  test: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

const results: VerificationResult[] = [];

/**
 * Test 1: Verify .lean() works with populate
 */
async function testLeanWithPopulate(): Promise<void> {
  console.log('\n📋 Test 1: Verifying .lean() with .populate()...');

  try {
    // Test with AnalyticsEvent
    const events = await AnalyticsEvent.find({})
      .populate('userId', 'email name')
      .limit(5)
      .lean()
      .exec();

    // Verify structure
    if (events.length > 0) {
      const event = events[0];
      const hasId = '_id' in event;
      const hasUserId = 'userId' in event;
      const isPlainObject = event.constructor === Object;

      if (hasId && hasUserId && isPlainObject) {
        results.push({
          test: 'lean_with_populate_analytics',
          passed: true,
          message: '.lean() with populate returns plain objects correctly',
        });
      } else {
        results.push({
          test: 'lean_with_populate_analytics',
          passed: false,
          message: '.lean() did not return plain object',
          details: { hasId, hasUserId, isPlainObject },
        });
      }
    } else {
      results.push({
        test: 'lean_with_populate_analytics',
        passed: true,
        message: 'No events found, but query executed successfully',
      });
    }

    // Test with Project
    const projects = await Project.find({ serviceType: 'recycling' })
      .populate('userId', 'name email')
      .limit(5)
      .lean()
      .exec();

    if (projects.length > 0) {
      const project = projects[0];
      const isPlainObject = project.constructor === Object;
      const hasPopulatedField = 'userId' in project;

      if (isPlainObject && hasPopulatedField) {
        results.push({
          test: 'lean_with_populate_project',
          passed: true,
          message: '.lean() with populate works for Project model',
        });
      } else {
        results.push({
          test: 'lean_with_populate_project',
          passed: false,
          message: 'Project .lean() did not return plain object',
          details: { isPlainObject, hasPopulatedField },
        });
      }
    } else {
      results.push({
        test: 'lean_with_populate_project',
        passed: true,
        message: 'No projects found, but query executed successfully',
      });
    }
  } catch (error) {
    results.push({
      test: 'lean_with_populate',
      passed: false,
      message: `Error testing .lean() with populate: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * Test 2: Verify soft-delete queries
 */
async function testSoftDeleteQueries(): Promise<void> {
  console.log('\n📋 Test 2: Verifying soft-delete queries...');

  try {
    // Test excludeDeleted
    const excludeQuery = excludeDeleted({ serviceType: 'recycling' });
    const expectedExclude = { serviceType: 'recycling', isDeleted: { $ne: true } };

    if (JSON.stringify(excludeQuery) === JSON.stringify(expectedExclude)) {
      results.push({
        test: 'exclude_deleted_query',
        passed: true,
        message: 'excludeDeleted() generates correct query',
      });
    } else {
      results.push({
        test: 'exclude_deleted_query',
        passed: false,
        message: 'excludeDeleted() did not generate expected query',
        details: { got: excludeQuery, expected: expectedExclude },
      });
    }

    // Test includeDeleted
    const includeQuery = includeDeleted({ serviceType: 'recycling' });
    const expectedInclude = { serviceType: 'recycling', isDeleted: true };

    if (JSON.stringify(includeQuery) === JSON.stringify(expectedInclude)) {
      results.push({
        test: 'include_deleted_query',
        passed: true,
        message: 'includeDeleted() generates correct query',
      });
    } else {
      results.push({
        test: 'include_deleted_query',
        passed: false,
        message: 'includeDeleted() did not generate expected query',
        details: { got: includeQuery, expected: expectedInclude },
      });
    }

    // Test actual queries
    const activeProjects = await Project.countDocuments(excludeDeleted({ serviceType: 'recycling' }));
    const deletedProjects = await Project.countDocuments(includeDeleted({ serviceType: 'recycling' }));
    const allProjects = await Project.countDocuments({ serviceType: 'recycling' });

    if (activeProjects + deletedProjects === allProjects) {
      results.push({
        test: 'soft_delete_count_verification',
        passed: true,
        message: 'Soft-delete queries return correct counts',
        details: { active: activeProjects, deleted: deletedProjects, total: allProjects },
      });
    } else {
      results.push({
        test: 'soft_delete_count_verification',
        passed: false,
        message: 'Soft-delete counts do not match',
        details: { active: activeProjects, deleted: deletedProjects, total: allProjects },
      });
    }

    // Test with combineQueries
    const combinedQuery = combineQueries(
      { serviceType: 'recycling' },
      excludeDeleted({}),
      buildDateRange(new Date('2024-01-01'), new Date('2024-12-31'), 'collectionDate')
    );

    const hasServiceType = 'serviceType' in combinedQuery;
    const hasIsDeleted = 'isDeleted' in combinedQuery;
    const hasCollectionDate = 'collectionDate' in combinedQuery;

    if (hasServiceType && hasIsDeleted && hasCollectionDate) {
      results.push({
        test: 'combine_queries',
        passed: true,
        message: 'combineQueries() correctly merges multiple query objects',
      });
    } else {
      results.push({
        test: 'combine_queries',
        passed: false,
        message: 'combineQueries() did not merge correctly',
        details: { hasServiceType, hasIsDeleted, hasCollectionDate },
      });
    }
  } catch (error) {
    results.push({
      test: 'soft_delete_queries',
      passed: false,
      message: `Error testing soft-delete queries: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * Test 3: Verify aggregation results with $facet
 */
async function testAggregationFacet(): Promise<void> {
  console.log('\n📋 Test 3: Verifying aggregation $facet results...');

  try {
    const matchQuery = combineQueries(
      { serviceType: 'recycling' },
      excludeDeleted({})
    );

    // Test $facet aggregation
    const facetResult = await Project.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          totalStats: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
                totalCollections: { $sum: 1 },
              },
            },
          ],
          byLocationType: [
            {
              $group: {
                _id: '$locationType',
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    if (facetResult.length > 0 && facetResult[0].totalStats && facetResult[0].byLocationType) {
      results.push({
        test: 'facet_aggregation_structure',
        passed: true,
        message: '$facet returns correct structure',
        details: {
          hasTotalStats: Array.isArray(facetResult[0].totalStats),
          hasByLocationType: Array.isArray(facetResult[0].byLocationType),
        },
      });
    } else {
      results.push({
        test: 'facet_aggregation_structure',
        passed: false,
        message: '$facet did not return expected structure',
        details: facetResult,
      });
    }

    // Compare with separate aggregations
    const [separateTotal, _separateByType] = await Promise.all([
      Project.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
            totalCollections: { $sum: 1 },
          },
        },
      ]),
      Project.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$locationType',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const facetTotal = facetResult[0]?.totalStats[0];
    const separateTotalResult = separateTotal[0];

    if (facetTotal && separateTotalResult) {
      const totalMatch = facetTotal.totalRevenue === separateTotalResult.totalRevenue &&
        facetTotal.totalCollections === separateTotalResult.totalCollections;

      if (totalMatch) {
        results.push({
          test: 'facet_vs_separate_aggregation',
          passed: true,
          message: '$facet results match separate aggregations',
          details: {
            facetTotal: facetTotal.totalRevenue,
            separateTotal: separateTotalResult.totalRevenue,
          },
        });
      } else {
        results.push({
          test: 'facet_vs_separate_aggregation',
          passed: false,
          message: '$facet results do not match separate aggregations',
          details: {
            facet: facetTotal,
            separate: separateTotalResult,
          },
        });
      }
    } else {
      results.push({
        test: 'facet_vs_separate_aggregation',
        passed: true,
        message: 'No data to compare, but structure is correct',
      });
    }
  } catch (error) {
    results.push({
      test: 'aggregation_facet',
      passed: false,
      message: `Error testing $facet aggregations: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * Test 4: Verify buildDateRange utility
 */
async function testBuildDateRange(): Promise<void> {
  console.log('\n📋 Test 4: Verifying buildDateRange utility...');

  try {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');

    const dateQuery = buildDateRange(startDate, endDate, 'collectionDate');

    const hasCollectionDate = 'collectionDate' in dateQuery;
    const hasGte = dateQuery.collectionDate?.$gte;
    const hasLte = dateQuery.collectionDate?.$lte;
    const lteIsEndOfDay = hasLte && new Date(hasLte).getHours() === 23 &&
      new Date(hasLte).getMinutes() === 59;

    if (hasCollectionDate && hasGte && hasLte && lteIsEndOfDay) {
      results.push({
        test: 'build_date_range',
        passed: true,
        message: 'buildDateRange() generates correct date query',
      });
    } else {
      results.push({
        test: 'build_date_range',
        passed: false,
        message: 'buildDateRange() did not generate expected query',
        details: { hasCollectionDate, hasGte, hasLte, lteIsEndOfDay },
      });
    }

    // Test with only start date
    const startOnly = buildDateRange(startDate, undefined, 'collectionDate');
    if ('collectionDate' in startOnly && startOnly.collectionDate?.$gte && !startOnly.collectionDate?.$lte) {
      results.push({
        test: 'build_date_range_start_only',
        passed: true,
        message: 'buildDateRange() handles start date only',
      });
    } else {
      results.push({
        test: 'build_date_range_start_only',
        passed: false,
        message: 'buildDateRange() did not handle start date only correctly',
      });
    }
  } catch (error) {
    results.push({
      test: 'build_date_range',
      passed: false,
      message: `Error testing buildDateRange: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * Main verification function
 */
async function runVerification(): Promise<void> {
  console.log('🔍 Starting MongoDB Optimization Verification...\n');

  try {
    // Verify User model is registered (should be registered via import)
    // This check happens here (not at module load) to ensure imports are processed
    if (!mongoose.models.User) {
      console.error('❌ Error: User model not registered');
      console.error('This should not happen - User model should be registered via import.');
      console.error('Make sure the User model import is working correctly.');
      process.exit(1);
    }

    // Check if MongoDB URI is configured
    if (!config.mongodbUri) {
      console.error('❌ Error: MONGODB_URI is not defined in environment variables');
      console.error('\nPlease set MONGODB_URI in your .env file:');
      console.error('  MONGODB_URI=mongodb://localhost:27017/everbloom');
      console.error('\nOr for MongoDB Atlas:');
      console.error('  MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/everbloom');
      process.exit(1);
    }

    console.log(`📡 Connecting to MongoDB...`);
    console.log(`   URI: ${config.mongodbUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);

    // Connection options optimized for both local MongoDB and MongoDB Atlas
    const isLocalMongo = config.mongodbUri.includes('localhost') || config.mongodbUri.includes('127.0.0.1');
    const connectionOptions: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: isLocalMongo ? 5000 : 30000,
      socketTimeoutMS: isLocalMongo ? 10000 : 45000,
      connectTimeoutMS: isLocalMongo ? 5000 : 30000,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
    };

    await mongoose.connect(config.mongodbUri, connectionOptions);
    console.log('✅ Connected to MongoDB\n');

    await testLeanWithPopulate();
    await testSoftDeleteQueries();
    await testAggregationFacet();
    await testBuildDateRange();

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION RESULTS');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.message}`);
      if (result.details && !result.passed) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log('='.repeat(60) + '\n');

    if (failed > 0) {
      console.log('⚠️  Some tests failed. Please review the details above.');
      process.exit(1);
    } else {
      console.log('✅ All verification tests passed!');
      process.exit(0);
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('MongooseServerSelectionError')) {
        console.error('❌ Error: Could not connect to MongoDB');
        console.error('\nPossible issues:');
        console.error('  1. MongoDB is not running');
        console.error('  2. MONGODB_URI is incorrect');
        console.error('  3. Network/firewall blocking connection');
        console.error('\nTo start MongoDB locally:');
        console.error('  - Docker: docker-compose up -d mongodb');
        console.error('  - Local: mongod (if installed)');
        console.error('\nCurrent MONGODB_URI:', config.mongodbUri?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') || 'not set');
      } else {
        console.error('❌ Verification failed with error:', error.message);
        console.error('\nFull error:', error);
      }
    } else {
      console.error('❌ Verification failed with error:', error);
    }
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

// Run verification
runVerification().catch(console.error);

