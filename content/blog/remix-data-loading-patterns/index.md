---
title: Data loading patterns in remix applications
date: "2024-02-22T04:40:56Z"
author: "mmilovanov"
tags:
- remix
- ssr
- react
- react-router
---

## Introduction

Next.js, Remix and other server side rendering(SSR) applications bring a lot of value to our customers and to the company, they allow users to see web pages on weak devices, with disabled Javascript and generally ranked higher in the search results, because crawlers can see server generated page with all the content which drastically different from client side rendering(CSR), where browser gets empty HTML page on first request, then gets all the scripts, then gets all required data and renders the page. 

Frameworks such Remix and Next.js allow best parts of two worlds, initial render happens on the server, browser gets full HTML page and while user is busy deciding what to do next, browser gets all the Javascript and hydrates the page, then all rendering happens on the client side, as an additional advantage developer can think about progressive enhancement and for example if Javascript not available fallback to SSR.

It’s all good when our SSR works fast enough, but what if we cannot return fully rendered HTML page instantly, for example in order to render HTML we would need to make time consuming request to 3rd party service, then user will have to wait for a response looking to the empty browser tab with a loading spinner in the tab header even worth than CSR where we can make at least nice loading spinner on the empty page or somehow explain to the user why it’s taking so long.

Today I’ll try to discuss couple technics how we can mitigate those time consuming requests on our server side, to make user experience better.

## Setup
We will start with basic Remix application, after creating a project and adding some minimal functionality to navigate pages we have our initial application, Home and About page respond instantly, but profile page takes some time to load. Project code can be found in the following github repo [Initial branch](https://github.com/MMilovanovCG/remix-data-loading-paterns/tree/initial_state_long_profile_request) and [Profile page](https://github.com/MMilovanovCG/remix-data-loading-paterns/blob/initial_state_long_profile_request/app/routes/_.profile.tsx)

Reason behind prolonged loading time - we simulate time consuming api request to get "user details" for example

```
import { useLoaderData } from "@remix-run/react";

export async function loader() {
    return new Promise((resolve) => {
        setTimeout(() => resolve("Profile"), 3000); // represents long request
    });
}

export default function Profile() {
    const data = useLoaderData();
    return data;
}
```

3 seconds not very long time, API call might take much longer, but it feels unnatural to the user. There is no feedback after user selected profile page - check screen recording below

<div>
<video width="100%" autoplay loop muted preload src="initial_state.mov" />
</div>

Hope at this point we all understand the problem, let’s talk about possible solutions.

I’ll demo couple of them gradually improving and then we will talk about different caching and prefetching strategies.

## From bad to slightly better

First solution will be when we start navigation from home page to the profile, we can give user some feedback like we are working on your request and page will be up soon, let’s dive into home page code:[Leaving home page example](https://github.com/MMilovanovCG/remix-data-loading-paterns/tree/ssr_loading_state) and [Home page changes](https://github.com/MMilovanovCG/remix-data-loading-paterns/blob/ssr_loading_state/app/routes/_._index.tsx)

```
import { useNavigation } from "@remix-run/react";

export default function Home() {
    const nav = useNavigation();
    const isLoading = nav.state === 'loading';
    const content = isLoading ? 'Loading...' : "Home page";
    return content;
}
```
as you can see we use `useNavigation` hook and when state is loading we return `Loading...` as a page content, it works, at least user can see something happening while he or she is waiting for their profile to load. Problem with this approach we will have to add this code snippet to every page, where we expect user can go to profile page and it won’t help us when we navigate directly to profile page:

<div>
<video width="100%" autoplay loop muted preload src="home-page-changes.mov" />
</div>

and here we can see noticeable delay if we go straight to profile view:

<div>
<video width="100%" autoplay loop muted preload src="direct-access.mov" />
</div>

## Switching to CSR

Second option would be to switch to CSR, we will return partially rendered page, with data available quickly and then request data which require some time to load. Here we get benefits of both rendering methods, we can return the page with data required to render everything above the fold, to keep user busy, and then return additional data, which will appear below the fold which significantly improve our Largest contentful paint (LCP), here an example how can we achieve it. I won’t make it under the fold, but I hope it will be enough to understand how it works and how it might be useful, code first: [CSR with resource route](https://github.com/MMilovanovCG/remix-data-loading-paterns/tree/csr_resource_loading), [Profile page](https://github.com/MMilovanovCG/remix-data-loading-paterns/blob/csr_resource_loading/app/routes/_.profile.tsx) and [Profile resource endpoint](https://github.com/MMilovanovCG/remix-data-loading-paterns/blob/csr_resource_loading/app/routes/api.profile.tsx)

```
// profile resource
const getUserDetails = () => new Promise((resolve) => {
    setTimeout(() => resolve("User details"), 3000);
});

export async function loader() {
    return await getUserDetails();
}
```
```
// profile page
import { useFetcher, useLoaderData } from "@remix-run/react";
import { ReactNode, useEffect } from "react";

export async function loader() {
    return {
        mainPageContent: "Profile",
    };
}

export default function Profile() {
    const { mainPageContent } = useLoaderData<typeof loader>();
    const fetcher = useFetcher();

    useEffect(() => {
        fetcher.load('/api/profile')
    }, []);

    return <div>
        <div>
            {mainPageContent}
        </div>
        <div>
            {fetcher.data ? fetcher.data as ReactNode : <div>Loading...</div>}
        </div>
    </div >;
}
```

Here we return page with profile header and request all the data for user profile after page gets rendered in the browser, `useEffect` won't work on the server side, it will be triggered only when react runs in the browser, then it will send request to the resource route to get actual user data, when data available react will render it on the client side, opening profile page from the blank or navigating from home page will work the same:

<div>
<video width="100%" autoplay loop muted preload src="csr-p1.mov" />
</div>


## Remix way to CSR

Third option would be pretty much the same as second one, just without separate resource route: [Async and defer branch](https://github.com/MMilovanovCG/remix-data-loading-paterns/tree/async_data_loading) and [Profile page](https://github.com/MMilovanovCG/remix-data-loading-paterns/blob/async_data_loading/app/routes/_.profile.tsx)

```
import { Await, useAsyncValue, useLoaderData } from "@remix-run/react";
import { defer } from "@remix-run/node";
import { Suspense } from "react";

const getUserDetails = () => new Promise((resolve) => {
    setTimeout(() => resolve("User details"), 3000);
});

export async function loader() {
    return defer({
        deferedData: getUserDetails(),
        mainPageContent: "Profile",
    });
}

const UnderTheFoldContent = () => {
    const resolvedValue = useAsyncValue();
    return <>{resolvedValue}</>;
};

export default function Profile() {
    const { deferedData, mainPageContent } = useLoaderData<typeof loader>();

    return <div>
        <div>
            {mainPageContent}
        </div>
        <div>
            <Suspense fallback={<div>Loading...</div>}>
                <Await resolve={deferedData}>
                    <UnderTheFoldContent />
                </Await>
            </Suspense>
        </div>
    </div >;
}
```

A lot of things changed here, first of all our loading function returns deferred object, instead of a resolved promise, one property of that object is already resolved content, which we can render immediately, and second property is an unresolved promise. Then we have `Suspense` section on the page, it wraps `Await` component, while our promise not resolved we will render fallback state, when promise gets resolved we will render `UnderTheFoldContent` component, which has access to the resolved value with  `useAsyncValue` hook. So working application will look like this:

<div>
<video width="100%" autoplay loop muted preload src="csr-p2.mov" />
</div>

As you can see we have initial part of the page loaded immediately and when rest of our content available we update only loading part.

## Caching

I’m not sure if you noticed, but on our last demo we have a small issue we go to the profile page, load data, it takes 3 seconds, then we go back to home page and trying to open profile page again, user have to wait additional 3 seconds to get profile details, it’s not good, if our data do not change very often we probably can cache it, let’s consider our options and we have a lot of them: http, localStorage, sessionStorage, indexedDB and memory cache, let’s try some of them, we will start with http caching: [Http cache branch](https://github.com/MMilovanovCG/remix-data-loading-paterns/tree/http_cache) and [Profile page](https://github.com/MMilovanovCG/remix-data-loading-paterns/blob/http_cache/app/routes/_.profile.tsx)

the only change on profile page was to add http headers:

```
export async function loader() {
    return defer({
        deferedData: getUserDetails(),
        mainPageContent: "Profile",
    }, {
        headers: {
            "Cache-Control": "public, max-age=3600",
        },
    });
}
```

this tells browser to cache response from this page for an hour, so next time user goes to the page, we won’t hit our server at all, let’s watch our demo with disabled and enabled browser cache

<div>
<video width="100%" autoplay loop muted preload src="http-cache.mov" />
</div>

that’s one of the options, different option would be to use memory or any other storage as a cache, let’s check example for [Memory cache](https://github.com/MMilovanovCG/remix-data-loading-paterns/tree/memory_cache) and our [Profile page](https://github.com/MMilovanovCG/remix-data-loading-paterns/blob/memory_cache/app/routes/_.profile.tsx)

we use `clientLoader` and local variable as our cache:

```
let response: null | typeof loader | {} = null;
export async function clientLoader({serverLoader}: ClientLoaderFunctionArgs) {
    if (!response) {
        response = await serverLoader();
    }
    return response;
}

clientLoader.hydrate = true;
```

If router file has `clientLoader` function remix will call it instead of `loader` one of the arguments is `serverLoader` here we check if we already have response from the server, we don’t need to wait we simply return response, if we don’t have it we will have to wait for backend first.

`clientLoader.hydrate = true;` means call `clientLoader` on first load, if not set `clientLoader` will be called only on second page load.

as a result of this change we have following demo, even with disabled browser cache we can get our profile page pretty quick when we hit the cache

<div>
<video width="100%" autoplay loop muted preload src="memory-cache.mov" />
</div>

I mentioned we have an option to keep our cache in local storage, session storage or indexed DB, so instead of local variable we used in our last example we could use any of those options and to make our live easier there is a good library to work with all those APIs [localforage](https://github.com/localForage/localForage)

## Prefetching

Sometimes we can anticipate user's actions, in our case let’s say we know user will visit profile page sooner or later. In this case we can use react-router's feature to prefetch and cache content in advance, react-router provides us following strategies to prefetch:

```
 * - "intent": Fetched when the user focuses or hovers the link
 * - "render": Fetched when the link is rendered
 * - "viewport": Fetched when the link is in the viewport
```

for this demo app, there is no difference between viewport and render as we always display link to profile page in the viewport, so for simplicity I’ll use `render`, let’s see how it works: [Prefetch branch](https://github.com/MMilovanovCG/remix-data-loading-paterns/tree/prefetch), this time changes in our [NavBar](https://github.com/MMilovanovCG/remix-data-loading-paterns/blob/prefetch/app/components/Navbar.tsx#L18) component

```
<NavLink to="/profile" className={linkStyle} prefetch="render">
  Profile
</NavLink>
```

I just added `prefetch` attribute, let’s see the demo:

<div>
<video width="100%" autoplay loop muted preload src="prefetch.mov" />
</div>

As you can see on page refresh browser immediately sends profile request, it still takes some time to get the data, but user is busy with something else at the moment, so when user goes to the profile page we already have all the data in the prefetch cache.

As a conclusion I can say there is no silver bullet to fix slow API responses, but in some cases we can work around them and Remix pretty flexible and gives us many different options