const { ImageFill } = require("scenegraph");



const $ = sel => document.querySelector(sel);
function createDialog(id = "dialog") {
    const sel = `#${id}`;
    let dialog = document.querySelector(sel);
    if (dialog) {
        console.log("Reusing old dialog");
        return dialog;
    }
    document.body.innerHTML = `
<style>
    ${sel} form {
        width: 300px;
    }
</style>
<dialog id="${id}">
    <form method="dialog">
        <h1>Pixabay image filler</h1>
        <label>
            <span>Image topic?</span>
            <input uxp-quiet="true" type="text" id="name" placeholder="i.e. red flowers"/>
        </label>
        <footer>
        <button type="submit" id="ok" uxp-variant="cta">Fill!</button>
            <button id="cancel">Cancel</button>
        </footer>
    </form>
</dialog>
`;
    dialog = document.querySelector(sel);
    const [form, cancel, ok, name] = [`${sel} form`, "#cancel", "#ok", "#name"].map(s => $(s));
    const submit = () => {
        dialog.close(name.value);
    };
    cancel.addEventListener("click", () => {
        dialog.close();
    });
    ok.addEventListener("click", e => {
        submit();
        e.preventDefault();
    });
    form.onsubmit = submit;
    return dialog;
}


async function applyImage(selection) {
    const dialog = createDialog();
    try {
        const r = await dialog.showModal();
        if (r) {
            console.log(`You will search for ${r}`, ' Items count: ', selection.items.length);

            if (selection.items.length) {
                const length = (selection.items.length>2)?'&per_page='+selection.items.length:''
                const url = "https://pixabay.com/api/?key=8607217-a85bed065b4a6407d557579a3&q="+r.split("+")+"&image_type=photo&pretty=true" +length ;
                
                console.log('url ', url)
                const response = await fetch(url);
                const jsonResponse = await response.json();
               
                return downloadImage(selection, jsonResponse['hits'],selection.items.length);
            } else {
                console.log("Please select a shape to apply the downloaded image.");
            }
        }
    }
    catch (err) {
        console.log("ESC dismissed dialog");
    }



  

}

async function downloadImage(selection, jsonResponse,length) {
    try {

console.log('downloadImage array', jsonResponse)

for (let index = 0; index < length; index++) {
    const element = jsonResponse[index];
    const photoUrl = element.largeImageURL;
    const photoObj = await xhrBinary(photoUrl);
    const photoObjBase64 = await base64ArrayBuffer(photoObj);
    applyImagefill(selection, photoObjBase64,index);
}

       
        
        

    } catch (err) {
        console.log("error")
        console.log(err.message);
    }
}

function xhrBinary(url) {
    return new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.onload = () => {
            if (req.status === 200) {
                try {
                    const arr = new Uint8Array(req.response);
                    resolve(arr);
                } catch (err) {
                    reject('Couldnt parse response. ${err.message}, ${req.response}');
                }
            } else {
                reject('Request had an error: ${req.status}');
            }
        }
        req.onerror = reject;
        req.onabort = reject;
        req.open('GET', url, true);
        req.responseType = "arraybuffer";
        req.send();
    });
}

function applyImagefill(selection, base64,index) {
   
    return new Promise(resolve => {
        const imageFill = new ImageFill(`data:image/jpeg;base64,${base64}`);
    
selection.items[index].fill = imageFill


    resolve()
      });
  
}

function base64ArrayBuffer(arrayBuffer) {
    let base64 = '';
    const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    const bytes = new Uint8Array(arrayBuffer);
    const byteLength = bytes.byteLength;
    const byteRemainder = byteLength % 3;
    const mainLength = byteLength - byteRemainder;

    let a;
    let b;
    let c;
    let d;
    let chunk;

    // Main loop deals with bytes in chunks of 3
    for (let i = 0; i < mainLength; i += 3) {
        // Combine the three bytes into a single integer
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

        // Use bitmasks to extract 6-bit segments from the triplet
        a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
        b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
        c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
        d = chunk & 63;        // 63       = 2^6 - 1

        // Convert the raw binary segments to the appropriate ASCII encoding
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder === 1) {
        chunk = bytes[mainLength];

        a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

        // Set the 4 least significant bits to zero
        b = (chunk & 3) << 4; // 3   = 2^2 - 1

        base64 += `${encodings[a]}${encodings[b]}==`;
    } else if (byteRemainder === 2) {
        chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

        a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
        b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

        // Set the 2 least significant bits to zero
        c = (chunk & 15) << 2; // 15    = 2^4 - 1

        base64 += `${encodings[a]}${encodings[b]}${encodings[c]}=`;
    }

    return base64;
}

module.exports = {
    commands: {
        applyImage
    }
}
