
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/accounts" | "/api" | "/api/accounts" | "/api/proxies" | "/api/stats" | "/api/tunnels" | "/proxy" | "/subscription" | "/tunnels";
		RouteParams(): {

		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/accounts": Record<string, never>;
			"/api": Record<string, never>;
			"/api/accounts": Record<string, never>;
			"/api/proxies": Record<string, never>;
			"/api/stats": Record<string, never>;
			"/api/tunnels": Record<string, never>;
			"/proxy": Record<string, never>;
			"/subscription": Record<string, never>;
			"/tunnels": Record<string, never>
		};
		Pathname(): "/" | "/accounts" | "/accounts/" | "/api" | "/api/" | "/api/accounts" | "/api/accounts/" | "/api/proxies" | "/api/proxies/" | "/api/stats" | "/api/stats/" | "/api/tunnels" | "/api/tunnels/" | "/proxy" | "/proxy/" | "/subscription" | "/subscription/" | "/tunnels" | "/tunnels/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/robots.txt" | string & {};
	}
}