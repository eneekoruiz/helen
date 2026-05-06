export function createEmptyResult(moduleId, moduleName) {
    return {
        moduleId,
        moduleName,
        created: [],
        modified: [],
        skipped: [],
        warnings: [],
        nextSteps: [],
    };
}
//# sourceMappingURL=context.js.map