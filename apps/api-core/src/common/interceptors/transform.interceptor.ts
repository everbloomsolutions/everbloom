import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { LoggerService } from '../../infrastructure/logger/logger.service';

export interface Response<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>> {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('TransformInterceptor');
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const url = request?.url || request?.path || '';
    // Match both /api/v1/admin/dashboard and /admin/dashboard patterns
    const isDashboardEndpoint = url.includes('/admin/dashboard') || url.includes('admin/dashboard');
    const isTodayEndpoint = url.includes('/admin/dashboard/today') || url.includes('admin/dashboard/today');

    return next.handle().pipe(
      map((data) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- response shape varies by endpoint; dashboardData mutated below
        let response: any;

        // If data already has success property, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          response = data;
        } else {
          // If no success property, wrap it
          response = {
            success: true,
            data: data ?? {},
          };
        }

        // Defensive checks for dashboard endpoints to ensure collections is always present
        if (isDashboardEndpoint) {
          // Ensure response.data exists and is an object
          if (!response.data || typeof response.data !== 'object') {
            response.data = {};
          }

          let dashboardData = response.data;
          if (!dashboardData || typeof dashboardData !== 'object') {
            response.data = dashboardData = {};
          }

          // Special handling for /dashboard/today endpoint (flat structure)
          if (isTodayEndpoint) {
            // For today endpoint, data is a flat object with newUsers, newProjects, newLocations, collections, date
            // Ensure collections exists - use newProjects as fallback
            const collectionsValue = Number(dashboardData.collections ?? dashboardData.newProjects ?? 0);

            // Ensure all numeric fields are numbers
            dashboardData.newUsers = Number(dashboardData.newUsers) || 0;
            dashboardData.newProjects = Number(dashboardData.newProjects) || 0;
            dashboardData.newLocations = Number(dashboardData.newLocations) || 0;
            dashboardData.collections = collectionsValue;

            // Debug logging to see what we're working with
            this.logger.log('Processing /dashboard/today', {
              url,
              originalDashboardData: JSON.parse(JSON.stringify(dashboardData)),
              collectionsValue,
            });

            // Debug logging (remove in production if needed)
            if (typeof dashboardData.collections === 'undefined' || dashboardData.collections === null || isNaN(dashboardData.collections)) {
              this.logger.warn('Collections is invalid for /dashboard/today', {
                url,
                originalData: dashboardData,
                collectionsValue,
              });
              dashboardData.collections = 0; // Fallback to 0
            }

            // Create today object with all properties (ALWAYS create, don't conditionally check)
            // Frontend might access response.data.today.collections
            const todayObject = {
              collections: dashboardData.collections,
              newUsers: dashboardData.newUsers,
              newProjects: dashboardData.newProjects,
              newLocations: dashboardData.newLocations,
              date: dashboardData.date || new Date().toISOString().split('T')[0],
            };

            // ALWAYS set today object (frontend expects response.data.today.collections)
            dashboardData.today = todayObject;

            // Also ensure data.data.collections exists (for double-nested access patterns like response.data.data.collections)
            // ALWAYS create this structure, don't conditionally check
            dashboardData.data = {
              collections: dashboardData.collections,
              newUsers: dashboardData.newUsers,
              newProjects: dashboardData.newProjects,
              newLocations: dashboardData.newLocations,
              date: dashboardData.date || new Date().toISOString().split('T')[0],
              today: todayObject, // Include today in nested data.data
            };

            // Final safety check: ensure all possible access patterns have valid values
            // This prevents "Cannot read properties of undefined" errors
            if (!dashboardData.today || typeof dashboardData.today !== 'object') {
              dashboardData.today = todayObject;
            }
            if (!dashboardData.data || typeof dashboardData.data !== 'object') {
              dashboardData.data = {
                collections: dashboardData.collections,
                newUsers: dashboardData.newUsers,
                newProjects: dashboardData.newProjects,
                newLocations: dashboardData.newLocations,
                date: dashboardData.date || new Date().toISOString().split('T')[0],
                today: todayObject,
              };
            }
            if (!dashboardData.data.today || typeof dashboardData.data.today !== 'object') {
              dashboardData.data.today = todayObject;
            }

            // Log final structure for debugging (after creating all nested structures)
            this.logger.log('Final response structure for /dashboard/today', {
              url,
              responseStructure: {
                success: response.success,
                data: {
                  collections: dashboardData.collections,
                  today: dashboardData.today,
                  hasData: !!dashboardData.data,
                  dataToday: dashboardData.data?.today,
                  dataCollections: dashboardData.data?.collections,
                  allPathsValid: {
                    'data.collections': typeof dashboardData.collections !== 'undefined',
                    'data.today': !!dashboardData.today,
                    'data.today.collections': typeof dashboardData.today?.collections !== 'undefined',
                    'data.data': !!dashboardData.data,
                    'data.data.collections': typeof dashboardData.data?.collections !== 'undefined',
                    'data.data.today': !!dashboardData.data?.today,
                    'data.data.today.collections': typeof dashboardData.data?.today?.collections !== 'undefined',
                  },
                },
              },
            });
          } else {
            // For other dashboard endpoints (nested structure)
            // Get collections value from any available source
            const collectionsValue = dashboardData.collections
              || dashboardData.today?.collections
              || dashboardData.today?.newProjects
              || dashboardData.overview?.projects?.collections
              || dashboardData.overview?.projects?.total
              || 0;

            // Ensure top-level collections exists
            if (typeof dashboardData.collections === 'undefined') {
              dashboardData.collections = collectionsValue;
            }

            // Ensure today object exists and has collections
            if (!dashboardData.today) {
              dashboardData.today = { collections: collectionsValue };
            } else if (typeof dashboardData.today.collections === 'undefined') {
              dashboardData.today.collections = dashboardData.today.newProjects || collectionsValue;
            }

            // Ensure overview object exists
            if (!dashboardData.overview) {
              dashboardData.overview = { projects: { collections: collectionsValue } };
            } else {
              // Ensure overview.projects exists
              if (!dashboardData.overview.projects) {
                dashboardData.overview.projects = { collections: collectionsValue };
              } else if (typeof dashboardData.overview.projects.collections === 'undefined') {
                dashboardData.overview.projects.collections = dashboardData.overview.projects.total || collectionsValue;
              }
            }

            // Ensure data.data.collections exists (for double-nested access patterns like response.data.data.collections)
            if (!dashboardData.data) {
              dashboardData.data = {
                collections: collectionsValue,
                today: dashboardData.today || { collections: collectionsValue },
                overview: dashboardData.overview || { projects: { collections: collectionsValue } },
              };
            } else {
              if (typeof dashboardData.data.collections === 'undefined') {
                dashboardData.data.collections = collectionsValue;
              }
              if (!dashboardData.data.today) {
                dashboardData.data.today = dashboardData.today || { collections: collectionsValue };
              }
              if (!dashboardData.data.overview) {
                dashboardData.data.overview = dashboardData.overview || { projects: { collections: collectionsValue } };
              }
            }
          }
        }

        return response;
      }),
    );
  }
}
