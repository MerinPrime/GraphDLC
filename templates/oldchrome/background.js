browser.browserAction.onClicked.addListener(() => {
    browser.tabs.create({
        url: "https://logic-arrows.io/settings"
    });
});
