(() => {
    const BUTTON_CLASS = 'igd-post-inline-download';
    const DOWNLOAD_ALL_BUTTON_CLASS = 'igd-post-inline-download-all';
    const ACTION_LABELS = new Set(['Like', 'Comment', 'Repost', 'Share', 'Share Post', 'Save']);
    let updateQueued = false;

    function isSupportedView() {
        return window.location.pathname === '/' || IG_POST_REGEX.test(window.location.pathname);
    }

    function isVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }

    function findShareButtons() {
        return [...document.querySelectorAll('svg[aria-label="Share"], svg[aria-label="Share Post"]')]
            .filter(isVisible)
            .map((icon) => icon.closest('button, [role="button"]'))
            .filter(Boolean);
    }

    function findActionsContainer(shareButton) {
        let container = shareButton.parentElement;
        while (container && container !== document.body) {
            const labels = new Set(
                [...container.querySelectorAll('svg[aria-label]')]
                    .filter(isVisible)
                    .map((icon) => icon.getAttribute('aria-label'))
                    .filter((label) => ACTION_LABELS.has(label)),
            );
            if (labels.size >= 3) return container;
            container = container.parentElement;
        }
        return null;
    }

    function findDirectChild(container, descendant) {
        let child = descendant;
        while (child?.parentElement && child.parentElement !== container) child = child.parentElement;
        return child?.parentElement === container ? child : null;
    }

    function getPostRoot(shareButton) {
        return shareButton.closest('article') ?? document;
    }

    function extractShortcode(href) {
        const path = new URL(href, window.location.origin).pathname;
        const match = path.match(/\/(?:p|tv|reel|reels)\/([A-Za-z0-9_-]+)/);
        if (!match || ['audio', 'liked_by'].includes(match[1])) return '';
        return match[1];
    }

    function getPostShortcode(root) {
        if (root === document) return window.location.pathname.match(IG_POST_REGEX)?.[2] ?? '';

        const links = [...root.querySelectorAll('a[href]')];
        const postLink = links.find((link) => /\/p\/[A-Za-z0-9_-]+/.test(link.getAttribute('href') ?? ''));
        if (postLink) return extractShortcode(postLink.getAttribute('href'));

        for (const mediaLink of links) {
            const href = mediaLink.getAttribute('href') ?? '';
            if (!/\/(?:tv|reel|reels)\/[A-Za-z0-9_-]+/.test(href)) continue;
            const shortcode = extractShortcode(href);
            if (shortcode) return shortcode;
        }

        return window.location.pathname.match(IG_POST_REGEX)?.[2] ?? '';
    }

    function isCarouselPost(root) {
        if (root.querySelectorAll('button[aria-label^="Go to slide"]').length > 1) return true;

        const media = [...root.querySelectorAll('img, video')]
            .filter(isVisible)
            .map((element) => element.getBoundingClientRect())
            .filter((rect) => rect.width >= 200 && rect.height >= 200 && rect.bottom > 0 && rect.top < innerHeight);
        if (!media.length) return false;

        const largestArea = Math.max(...media.map((rect) => rect.width * rect.height));
        const mainMedia = media.filter((rect) => rect.width * rect.height >= largestArea * 0.65);
        const controls = [
            ...new Set(
                [...root.querySelectorAll('[aria-label="Next"], [aria-label="Go back"], [aria-label="Previous"]')]
                    .map((element) => element.closest('button, [role="button"]'))
                    .filter((element) => element && isVisible(element)),
            ),
        ];

        return controls.some((control) => {
            const rect = control.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            return mainMedia.some(
                (mediaRect) =>
                    centerX >= mediaRect.left &&
                    centerX <= mediaRect.right &&
                    centerY >= mediaRect.top &&
                    centerY <= mediaRect.bottom,
            );
        });
    }

    function getCurrentPostMediaIndex(root) {
        const activeSlide = root.querySelector('button[aria-current="step"][aria-label^="Go to slide"]');
        const slideNumber = Number(activeSlide?.getAttribute('aria-label')?.match(/\d+/)?.[0]);
        if (Number.isInteger(slideNumber) && slideNumber > 0) return slideNumber - 1;

        const urlIndex = Number(new URL(window.location.href).searchParams.get('img_index'));
        return Number.isInteger(urlIndex) && urlIndex > 0 ? urlIndex - 1 : 0;
    }

    function createPostDownloadButton({ downloadAll, root, shortcode }) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = downloadAll ? DOWNLOAD_ALL_BUTTON_CLASS : BUTTON_CLASS;
        button.dataset.postShortcode = shortcode;
        button.title = downloadAll ? 'Download all post media as ZIP' : 'Download current post media';
        button.setAttribute(
            'aria-label',
            downloadAll ? 'Download all post media as ZIP' : 'Download current post media',
        );
        button.innerHTML = downloadAll
            ? `<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24">
                    <path d="M4 4h16v4H4zM5 8h14v12H5zM12 10v6m0 0 3-3m-3 3-3-3" />
               </svg>`
            : `<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24">
                    <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14" />
               </svg>`;
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            downloadInlineMedia({
                button,
                type: 'post',
                downloadAll,
                index: downloadAll ? 0 : getCurrentPostMediaIndex(root),
                shortcode,
            });
        });
        return button;
    }

    function findOwnButton(container, className) {
        return [...container.children].find((element) => element.classList.contains(className)) ?? null;
    }

    function syncPostDownloadButtons() {
        const activeButtons = new Set();
        const existingButtons = document.querySelectorAll(`.${BUTTON_CLASS}, .${DOWNLOAD_ALL_BUTTON_CLASS}`);
        if (!isSupportedView() || !downloadUiPreferences.shows('inline')) {
            existingButtons.forEach((button) => button.remove());
            return;
        }

        const handledContainers = new Set();
        for (const shareButton of findShareButtons()) {
            const actionsContainer = findActionsContainer(shareButton);
            if (!actionsContainer || handledContainers.has(actionsContainer)) continue;
            handledContainers.add(actionsContainer);

            const shareItem = findDirectChild(actionsContainer, shareButton);
            const root = getPostRoot(shareButton);
            const shortcode = getPostShortcode(root);
            if (!shareItem || !shortcode) continue;

            let singleButton = findOwnButton(actionsContainer, BUTTON_CLASS);
            if (!singleButton || singleButton.dataset.postShortcode !== shortcode) {
                singleButton?.remove();
                singleButton = createPostDownloadButton({ downloadAll: false, root, shortcode });
            }
            activeButtons.add(singleButton);

            let downloadAllButton = findOwnButton(actionsContainer, DOWNLOAD_ALL_BUTTON_CLASS);
            if (isCarouselPost(root)) {
                if (!downloadAllButton || downloadAllButton.dataset.postShortcode !== shortcode) {
                    downloadAllButton?.remove();
                    downloadAllButton = createPostDownloadButton({ downloadAll: true, root, shortcode });
                }
                activeButtons.add(downloadAllButton);
                if (shareItem.nextElementSibling !== downloadAllButton) {
                    shareItem.insertAdjacentElement('afterend', downloadAllButton);
                }
                if (downloadAllButton.nextElementSibling !== singleButton) {
                    downloadAllButton.insertAdjacentElement('afterend', singleButton);
                }
            } else {
                downloadAllButton?.remove();
                if (shareItem.nextElementSibling !== singleButton) {
                    shareItem.insertAdjacentElement('afterend', singleButton);
                }
            }
        }

        existingButtons.forEach((button) => {
            if (!activeButtons.has(button)) button.remove();
        });
    }

    function queueUpdate() {
        if (updateQueued) return;
        updateQueued = true;
        requestAnimationFrame(() => {
            updateQueued = false;
            syncPostDownloadButtons();
        });
    }

    const observer = new MutationObserver(queueUpdate);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('downloadUiModeChange', queueUpdate);
    navigation.addEventListener('navigate', queueUpdate);
    queueUpdate();
})();
