// ==UserScript==
// @name         {{name}}
// @namespace    https://logic-arrows.io/
// @version      {{version}}
// @description  {{description}}
// @author       {{author}}
// @match        https://logic-arrows.io/*
// @match        https://v1_2.logic-arrows.io/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

setTimeout(() => {
    try {
        ('use strict');

        function getFileContent(url) {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            xhr.send();
            if (xhr.status !== 200) {
                return undefined;
            }
            return xhr.responseText;
        }

        const logicArrowsHtml = getFileContent(document.location.href);
        if (logicArrowsHtml === undefined) return;

        window.document.close();
        window.document.open();

        {{BUNDLE_CODE}}

        window.document.write(logicArrowsHtml);
    } catch (e) {
        alert(e, e.message);
    }
}, 2000);
