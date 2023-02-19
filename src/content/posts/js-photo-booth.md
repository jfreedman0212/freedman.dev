---
title: "Adding a Photo Booth in JavaScript"
tagline: "A brief tutorial on building a feature that lets you take photos using a webcam from the browser."
datePosted: 2023-02-19T20:05:44.038Z
tags: ["javascript"]
---
[Live Demo](/examples/js-photo-booth)

At work, we got a requirement to build a feature that lets the user take a picture from their
camera and upload it. This works without JS on iOS (and maybe on the various Android browsers, 
not sure) by using `<input type="file">`, but may require JS on devices that don't let you
take a picture directly from the file input. It doesn't require any fancy libraries, just built-in 
browser APIs that are available in all modern browsers.

We won't be using a JS framework (React, Svelte, Vue, etc.) for this, but there's no reason
you can't; it's just JavaScript! In addition to the vanilla JS example, I'll include a link to
this same approach in React at the end. If you have an example with another tool, ping me on
Mastodon and I'll add a link to it here!

This guide assumes that you've written HTML and JS before and that you're familiar with how `Promise`s
and the `async`/`await` syntax works. If you're not, the 
[MDN documentation on async functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) 
is a great place to start.

# Setup

For simplicity, everything will be defined in a single HTML file:

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Photo Booth Example</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
            /* The CSS is here to make this not horribly ugly. It's still pretty ugly though */
            body {
                font-family: sans-serif;
            }
            h1 {
                margin: 0;
                text-align: center;
            }
            #container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
            }
            #buttonContainer {
                display: flex;
                gap: 0.5rem;
                justify-content: center;
            }
            #photosContainer {
                display: flex;
                gap: 0.5rem;
                overflow-x: auto;
                width: 100%;
            }
            #photoContainer > img {
                width: 640px;
                height: 480px;
            }
        </style>
    </head>
    <body>
        <main id="container">
            <h1>Photo Booth Example</h1>
            <div id="buttonContainer">
                <button id="enableCamera">Enable Camera</button>
                <button id="takePhoto" disabled="disabled">Take Photo</button>
            </div>
            <div id="videoContainer"></div>
            <div id="photosContainer"></div>
        </main>
        <script>
            // we'll include JS code here...
        </script>
    </body>
</html>
```

Copy and paste this into your favorite text editor and open this file in your browser. If you see
the heading, the "Enable Camera" button, you're ready for the next steps!

# Getting Permission for the Camera

First, we need to get permission from the user to use their camera, which we will do
via the `navigator.mediaDevices.getUserMedia`. This function will return a `MediaStream`
object containing the video feed if we're given permission and a device exists, or throws an error otherwise.
Let's add some JS to our `<script>` tag:

```js
// we'll use 640x480 for the dimensions here, but feel free to change them if needed
const WIDTH = 640;
const HEIGHT = 480;
let enableCameraButton = document.querySelector("#enableCamera");
let takePhotoButton = document.querySelector("#takePhoto");

enableCameraButton.addEventListener("click", async () => {
    let videoContainer = document.querySelector("#videoContainer");
    try {
        // first, attempt to get the user's video feed from the browser.
        // this can fail, so we wrap it in a try-catch. the failure modes will
        // typically be:
        //      1. the user doesn't have a camera
        //      2. the user denies permission to a camera
        // the user can also take no action, so this `await` will just wait indefinitely
        let stream = await navigator.mediaDevices.getUserMedia({ 
            // if you don't care about the size, `video` can just be a boolean.
            // or, you can set minimum, ideal, and maximum values for each.
            video: { width: WIDTH, height: HEIGHT }
        });
        // disable the button so only one video tag will be added (not ideal for production, but fine for this example)
        enableCameraButton.disabled = true;
    } catch (e) {
        // if requesting their camera fails for any reason, display the error message to them
        videoContainer.textContent = `${e.name} - ${e.message}`;
    }
});
```

If all goes well, clicking the "Enable Camera" button will show a browser prompt to the user to pick a camera to
use and ask whether they want to grant the permission. If you allow this and your camera shows a light or
some other indicator that it's on, it should show that indicator. If you deny it, you should see an appropriate 
error message below the button.

# Displaying the Camera Feed on the Page

We've successfully gotten access to their camera, but we need to see what we look like before taking a picture!
To display it on the page, we'll use the `video` tag, which the code for is below:

```js
enableCameraButton.addEventListener("click", async () => {
    // other code...
    try {
        // new code below:

        // create a video element to display the camera on the page
        let video = document.createElement("video");
        video.autoplay = true;
        video.srcObject = stream;
        video.width = WIDTH;
        video.height = HEIGHT;
        // need to append it to the container, otherwise it won't show up
        videoContainer.appendChild(video);
    } catch (e) {
        // catch block code...
    }
});
```

The crux of this is the `srcObject` attribute of the `video` tag. `srcObject` is only available via JavaScript,
whereas the `src` attribute is available in both HTML and JS. They both provide the video content, but allow you
to use different... sources. Use `src` if you're pointing to a URL that exists already, or use `srcObject` if your
content is coming from a different source (such as this case, it's coming from the user's camera).

With that said, now you should see yourself on the page!

# Taking a Photo

The final step of this is to take the photo, which we'll do by enabling the "Take Photo" button, adding
a `click` event handler for it, and using the `ImageCapture` API. We'll also add this code to the
end of the same `try` as before:

```js
enableCameraButton.addEventListener("click", async () => {
    // other code...
    try {
        // new code below:

        // enable the Take a Photo button and add the event handler
        takePhotoButton.disabled = false;
        takePhotoButton.addEventListener("click", async () => {
            // step 1: take the photo
            let imageCapture = new ImageCapture(stream.getVideoTracks()[0]);
            let blob = await imageCapture.takePhoto();
            let url = URL.createObjectURL(blob);

            // step 2: append it to the document
            let photosContainer = document.querySelector("#photosContainer");
            let img = document.createElement("img");
            img.src = url;
            photosContainer.appendChild(img);
        });
    } catch (e) {
        // catch block code...
    }
});
```

If you're using Chrome (more on that in a moment), you should see the pictures you took
populating below the video feed!

## Wait, but this isn't working for me in Safari/Firefox/Other?!?!?!

As of writing, the `ImageCapture` API is experimental and not available in all browsers, namely
Safari and Firefox. There is a way around that by rendering the frame to a `<canvas>` element and taking
a photo of _that_. We'll write our code such that it uses the `ImageCapture` API if it exists,
and our backup if it doesn't. We'll start by creating a function that takes in a `MediaStream`
and returns a `Blob`, which you can add at the root level of the `<script>` tag:

```js
function takePhotoFromMediaStream(stream, videoElement) {
    // if ImageCapture is a global (i.e. defined in the window object), then use it
    // to take the photo
    if ("ImageCapture" in window) {
        let imageCapture = new ImageCapture(stream.getVideoTracks()[0]);
        // return the Promise object, but don't await it here!
        return imageCapture.takePhoto();
    }
    // otherwise, use the videoElement's current frame, render it to a canvas tag, and take
    // a photo of _that_
    return new Promise((resolve, reject) => {
        try {
            // create the canvas and get the rendering context
            let canvas = document.createElement("canvas");
            canvas.width = WIDTH;
            canvas.height = HEIGHT;
            let ctx = canvas.getContext("2d");
            // draw the image and convert it to an image, calling the Promise's resolve
            // function once the image is ready to download
            ctx.drawImage(videoElement, 0, 0, WIDTH, HEIGHT);
            canvas.toBlob(resolve, 'image/png'); // the first argument is a callback, weirdly enough
        } catch (e) {
            reject(e);
        }
    });
}
```

This article isn't about the Canvas API, but the TL;DR is that it lets you draw arbitrary content
to the screen. It's great for things like games and highly interactive content that may not be
easy to present via HTML. It also lets you take pictures of the currently-rendered content, which
we leverage to provide a backup implementation.

Next, update the "Take Photo" buttons `click` handler to use this function instead of calling the
`ImageCapture` API directly:

```js
// other code...
takePhotoButton.addEventListener("click", async () => {
    // remove the creation of the ImageCapture object
    let blob = await takePhotoFromMediaStream(stream, video);
    let url = URL.createObjectURL(blob);

    // step 2 code goes here...
});
```

Now, it should work regardless of which browser you're using.

# All Together!

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Photo Booth Example</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
            /* The CSS is here to make this not horribly ugly. It's still pretty ugly though */
            body {
                font-family: sans-serif;
            }
            h1 {
                margin: 0;
                text-align: center;
            }
            #container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
            }
            #buttonContainer {
                display: flex;
                gap: 0.5rem;
                justify-content: center;
            }
            #photosContainer {
                display: flex;
                gap: 0.5rem;
                overflow-x: auto;
                width: 100%;
            }
            #photoContainer > img {
                width: 640px;
                height: 480px;
            }
        </style>
    </head>
    <body>
        <main id="container">
            <h1>Photo Booth Example</h1>
            <div id="buttonContainer">
                <button id="enableCamera" type="button">Enable Camera</button>
                <button id="takePhoto" type="button" disabled="disabled">Take Photo</button>
            </div>
            <div id="videoContainer"></div>
            <div id="photosContainer"></div>
        </main>
        <script>
            // we'll use 640x480 for the dimensions here, but feel free to change them if needed
            const WIDTH = 640;
            const HEIGHT = 480;

            // this function returns a Promise<Blob>
            function takePhotoFromMediaStream(stream, videoElement) {
                // if ImageCapture is a global (i.e. defined in the window object), then use it
                // to take the photo
                if ("ImageCapture" in window) {
                    let imageCapture = new ImageCapture(stream.getVideoTracks()[0]);
                    // return the Promise object, but don't await it here!
                    return imageCapture.takePhoto();
                }
                // otherwise, use the videoElement's current frame, render it to a canvas tag, and take
                // a photo of _that_
                return new Promise((resolve, reject) => {
                    try {
                        // create the canvas and get the rendering context
                        let canvas = document.createElement("canvas");
                        canvas.width = WIDTH;
                        canvas.height = HEIGHT;
                        let ctx = canvas.getContext("2d");
                        // draw the image and convert it to an image, calling the Promise's resolve
                        // function once the image is ready to download
                        ctx.drawImage(videoElement, 0, 0, WIDTH, HEIGHT);
                        canvas.toBlob(resolve, 'image/png'); // the first argument is a callback, weirdly enough
                    } catch (e) {
                        reject(e);
                    }
                });
            }

            let enableCameraButton = document.querySelector("#enableCamera");
            let takePhotoButton = document.querySelector("#takePhoto");

            enableCameraButton.addEventListener("click", async () => {
                let videoContainer = document.querySelector("#videoContainer");
                try {
                    // first, attempt to get the user's video feed from the browser.
                    // this can fail, so we wrap it in a try-catch. the failure modes will
                    // typically be:
                    //      1. the user doesn't have a camera
                    //      2. the user denies permission to a camera
                    // the user can also take no action, so this `await` will just wait indefinitely
                    let stream = await navigator.mediaDevices.getUserMedia({ 
                        // if you don't care about the size, `video` can just be a boolean.
                        // or, you can set minimum, ideal, and maximum values for each.
                        video: { width: WIDTH, height: HEIGHT }
                    });
                    // disable the button so only one video tag will be added (you probably don't want this on
                    // a real site, but it's easier this way)
                    enableCameraButton.disabled = true;
                    // create a video element to display the camera on the page
                    let video = document.createElement("video");
                    video.autoplay = true;
                    video.srcObject = stream;
                    video.width = WIDTH;
                    video.height = HEIGHT;
                    videoContainer.appendChild(video);
                    // enable the Take a Photo button and add the event handler
                    takePhotoButton.disabled = false;
                    takePhotoButton.addEventListener("click", async () => {
                        // step 1: take the photo
                        let blob = await takePhotoFromMediaStream(stream, video);
                        let url = URL.createObjectURL(blob);

                        // step 2: append it to the document
                        let photosContainer = document.querySelector("#photosContainer");
                        let img = document.createElement("img");
                        img.src = url;
                        photosContainer.appendChild(img);
                    });
                } catch (e) {
                    // if requesting their camera fails for any reason, display the error message to them
                    videoContainer.textContent = `${e.name} - ${e.message}`;
                }
            });
        </script>
    </body>
</html>
```

There you have it: a working photo booth feature without any external libraries.

# Examples with other JS Frameworks

- [React](https://codesandbox.io/s/adoring-grass-ziuhto?file=/src/App.tsx)

# Helpful Links

If you'd like to learn more about the APIs we used in this article, check out these links below:

- [navigator.mediaDevices.getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
- [URL.createObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL)
- [video tag](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video)
- [ImageCapture API](https://developer.mozilla.org/en-US/docs/Web/API/ImageCapture)
- [ImageCapture Alternative from Emiel Zuurbier on Stack Overflow](https://stackoverflow.com/questions/62446301/alternative-for-the-imagecapture-api-for-better-browser-support/62447669#62447669)