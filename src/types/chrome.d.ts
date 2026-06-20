// Minimal ambient declarations for the small slice of the chrome.* extension
// APIs this popup uses (A5 "Fill on page"). Intentionally hand-written and
// narrow instead of pulling in the full @types/chrome package, since we only
// ever call chrome.tabs.query + chrome.scripting.executeScript from here.
declare namespace chrome {
    namespace tabs {
        interface Tab {
            id?: number
        }
        function query(queryInfo: {
            active?: boolean
            currentWindow?: boolean
        }): Promise<Tab[]>
    }

    namespace scripting {
        interface InjectionTarget {
            tabId: number
        }
        interface ScriptInjection<Args extends unknown[], Result> {
            target: InjectionTarget
            func: (...args: Args) => Result
            args?: Args
        }
        interface InjectionResult<Result> {
            result: Result
        }
        function executeScript<Args extends unknown[], Result>(
            injection: ScriptInjection<Args, Result>
        ): Promise<InjectionResult<Result>[]>
    }
}