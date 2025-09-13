export * from './logger.module';
export * from './logger.service';
export * from './logger.type';
export * from './logger.guard';

// The LoggerService now includes the following methods that handle both strings and objects:
// - error(input, trace?, context?, labels?, logTag?, additionalInfo?)
// - warn(input, context?, labels?, logTag?, additionalInfo?)
// - info(input, context?, labels?, logTag?, additionalInfo?) [NEW]
// - log(input, context?, labels?, logTag?, additionalInfo?)
// - debug(input, context?, labels?, logTag?, additionalInfo?)
// - verbose(input, context?, labels?, logTag?, additionalInfo?)
// - errorAxios(error, logTag?, additionalInfo?, context?, labels?)
//
// All methods can accept:
// - String: Simple text messages
// - Objects: Any plain object that will be JSON serialized for Loki and formatted for console
// - Errors: Standard Error objects with stack traces
// - AxiosErrors: HTTP errors with detailed request/response information
// - Any other type: Will be converted to string representation
//
// Preferred format: { logTag, errorOrException } or { logTag, ...data }
