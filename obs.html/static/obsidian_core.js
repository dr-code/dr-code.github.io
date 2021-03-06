// Init
// ----------------------------------------------------------------------------
// Globals (filled in by backend)
var no_tab_mode = 1;
var toc_pane = 1;
var mermaid_enabled = 1;
var toc_pane_div = "right_pane";
var content_pane_div = "left_pane";
var html_url_prefix = "";
var documentation_mode = 1;
var tab_mode = !no_tab_mode;
var gzip_hash = '53916284794572138502739844451520404736'                       // used to check whether the localStorage data is stale


// Onloads
// ----------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', load_theme);  //set theme as quickly as possible to avoid flickering
document.addEventListener('DOMContentLoaded', load_page);   // all the code that needs to be run when everything is loaded


// Keybindings
// ----------------------------------------------------------------------------

// to add a function callback on a keypress just run `OBSHTML_KEYPRESS_FUNCTIONS.push(my_func)`
var OBSHTML_KEYPRESS_FUNCTIONS = []
document.addEventListener('keypress', HandleKeyPress);
function HandleKeyPress(e) {
    OBSHTML_KEYPRESS_FUNCTIONS.forEach(func => {
        func(e)
    })
}


// Orchestration functions
// ----------------------------------------------------------------------------

function load_theme() {
    let theme_div = document.getElementById('theme');
    if (!theme_div){
        // if the theme selection div is not present, assume that the template does not support theming
        return false
    }

    let theme_name = window.localStorage.getItem('theme_name');
    if (!theme_name){
        window.localStorage.setItem('theme_name', 'obs-light');
    }
    set_theme(window.localStorage.getItem('theme_name'));
    document.getElementById('antiflash').style.display = 'none'; 
}

function set_theme(theme_name){
    let theme_div = document.getElementById('theme');
    if (!theme_div){
        // if the theme selection div is not present, assume that the template does not support theming
        return false
    }

    let body = document.body;

    // update localstorage 
    window.localStorage.setItem('theme_name', theme_name);

    // update select element
    theme_div.value = theme_name
    let theme_class = 'theme-'+theme_name;

    // remove previous theme class
    body.classList.forEach(class_name => {
        if (class_name.startsWith('theme-')){
            body.classList.remove(class_name);
        }
    });

    // add new
    body.classList.add(theme_class);
}

function load_page() {
    if (documentation_mode) {
        httpGetAsync(html_url_prefix + '/obs.html/data/graph.json', load_dirtree_as_left_pane, 0, 'callbackpath');
    }

    let collection = document.getElementsByClassName("container")
    if (collection.length > 0) {
        LoadTableOfContents(collection[0])
    }

    if (tab_mode) {
        SetLinks(0);
    }
    else {
        var links = document.getElementsByTagName('a');
        for (let i = 0; i < links.length; i++) {
            let l = links[i];
            if (l.getAttribute("href").includes('#')) {
                l.onclick = function () {

                    let current_url = document.URL
                    current_url = decodeURI(current_url.replace(window.location.protocol + '//', '').replace(window.location.host, ''))
                    let link = this.getAttribute("href")
                    link = link.replace(current_url, '')

                    if (link[0] != '#') {
                        link = this.getAttribute("href").replace('#', '#!')
                        window.location.href = link;
                        return false;
                    }

                    let levelcont = document.getElementsByClassName("container")[0];
                    var el = levelcont.querySelectorAll(link)[0];
                    if (el) {
                        el.parentElement.scrollTop = el.offsetTop - rem(6);
                    }
                    return false;
                };
                continue
            }
        }
    }

    // scroll to div
    if (window.location.hash.length > 2 && window.location.hash[1] == '!') {
        let link = '#' + window.location.hash.substring(2, window.location.hash.length)
        let levelcont = document.getElementsByClassName("container")[0];
        var el = levelcont.querySelectorAll(link)[0];
        if (el) {
            el.parentElement.scrollTop = el.offsetTop - rem(6);
        }
    }


    // Scroll container to #header link
    if (tab_mode && window.location.hash != '') {
        let el = document.getElementById(window.location.hash.substr(2));
        if (el) {
            el.parentElement.scrollTop = el.offsetTop - rem(6);
        }
    }

    // Init starting container
    FirstContainer = document.getElementsByClassName('container')[0];
    if (FirstContainer){
        FirstContainer.id = 'level-0';
        FirstContainer.level = '0';
        SetContainer(FirstContainer);
    }

    // Open the path on loading the page
    // This is everything after ?path=
    if (tab_mode) {
        var href = window.location.href;
        if (href.includes('?path=')) {
            path_to_open = href.split('?path=')[1].split('/');
            for (let i = 0; i < path_to_open.length; i++) {
                path_to_open[i] = decodeURIComponent(path_to_open[i]);
            }
        }
        OpenPath(1);
    }
}

function LoadTableOfContents(container_div)
{
    let collection = container_div.getElementsByClassName('toc')
    if (collection.length > 0) {
        let toc = collection[0];
        if (toc.getElementsByTagName('li').length > 1) {

            if (toc_pane && no_tab_mode) {
                let tpd = document.getElementById(toc_pane_div);
                tpd.display = 'block';
                tpd.innerHTML = '<span class="toc-header">Table of contents</span>' + collection[0].innerHTML;
            }
            else {
                toc.style.display = 'block';
                toc.innerHTML = '<h3>Table of Contents</h1>\n' + toc.innerHTML
            }
        }
    }

}

function SetContainer(container) {
    // This function is called on every (newly created) container. 
    // One container holds one tab

    // Set url
    // This will be set already if this is not the first tab
    if (typeof container.url === 'undefined') {
        container.url = window.location.pathname;
    }

    // Set click to get header link
    SetHeaders(container);

    // Load mermaid code
    if (mermaid_enabled){
        mermaid.init()
    }

    // set graph svg and button to have unique id across tabs
    svgs = container.querySelectorAll(".graph_svg");
    if (svgs.length == 1) {
        svgs[0].id = svgs[0].id.replace('{level}', container.level)
    }

    divs = container.querySelectorAll(".graph_div");
    if (divs.length == 1) {
        divs[0].id = divs[0].id.replace('{level}', container.level)
    }

    let buttons = container.querySelectorAll(".graph_button");
    if (buttons.length == 1) {
        buttons[0].level = container.level;
        buttons[0].id = buttons[0].id.replace('{level}', container.level)
    }
}

// Adds link icon to headers and creates the anchor link to the header.
function SetHeaders(container) {
    let els = container.childNodes;
    for (let i = 0; i < els.length; i++) {
        if (typeof els[i].tagName === 'undefined' || els[i].tagName[0] != 'H') {
            continue;
        }

        // iterate
        let n = 1;

        // Test if page is open already in another tab
        anchor_id = els[i].id + '-anchor';
        if (document.getElementById(anchor_id)) {
            let loop = true;
            while (loop) {
                if (document.getElementById(anchor_id + '_' + n)) {
                    n++;
                }
                else {
                    break;
                }
            }
            anchor_id += '_' + n;
        }

        els[i].anchor_id = anchor_id;

        // Add link icon + a href to the header
        let href = window.location.origin + container.url + '#!' + els[i].id;
        els[i].innerHTML = '<a id="' + anchor_id + '" class="anchor" href="' + href + '"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M7.775 3.275a.75.75 0 001.06 1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z"></path></svg></a>\n' + els[i].innerHTML

        // body onload is not called when staying within the page
        // we need to call the LoadPage() function manually
        let href_el = document.getElementById(anchor_id);
        href_el.onclick = function () {
            window.location.replace(this.href);
            LoadPage(0);
        }

        // Show/hide link icon
        els[i].onmouseover = function () {
            document.getElementById(this.anchor_id).style.visibility = 'visible';
        };
        els[i].onmouseleave = function () {
            document.getElementById(this.anchor_id).style.visibility = 'hidden';
        };
    }
}

// this function is called when the user clicks on the menu button (mobile mode)
function toggle_menu(){
    // In tabs mode there will be a hidden header that needs to follow what the main header does
    // (html hack for having a fixed header and correct vertical scrolling...)
    let h2 = document.getElementById('header2')

    
    let res = toggle('navbar', 'flex')
    if (!res){
        // If the menu is turned off --> also close the theme selector
        disable('theme-popup');

        if (h2){
            // Do the same but also for the mirror header (tabs mode only)
            let pu = document.getElementById('header2').getElementsByClassName('popup')[0];
            disable_el(pu);
        }
    }

    if (h2){
        // Also toggle the mirror header (tabs mode only)
        let res = toggle('navbar2', 'flex');
    }
}

// Core Functions 
// ----------------------------------------------------------------------------

function httpGetAsync(theUrl, callback, level, callbackpath) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp, level, theUrl, callbackpath);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}


// Helper Functions 
// ----------------------------------------------------------------------------

function rem(rem) {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}
function vh() {
    return Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
}
function print(...vals){ console.log(...vals)}

function toggle(id, display_value) {
    el = document.getElementById(id);
    return toggle_el(el, display_value);
}
function toggle_el(el, display_value) {
    if (el.style.display == 'none') {
        el.style.display = display_value;
        return true
    }
    else if (el.style.display == display_value) {
        el.style.display = 'none';
        return false
    }
    else {
        el.style.display = display_value;
        return true
    }
}

function disable(id){
    disable_el(document.getElementById(id));
}
function disable_el(el){
    el.style.display = 'none';
}

function cl_toggle(id, class_name) {
    let el = document.getElementById(id);
    if (el.classList.contains(class_name)) {
        el.classList.remove(class_name)
    } else {
        el.classList.add(class_name)
    }
}

function fold_callout(el) {
    let div = el.parentElement
    if (div.classList.contains("active")) {
        div.classList.remove("active")
    } else {
        div.classList.add("active")
    }
}

// general option, to replace function above
function fold(el) {
    if (el.classList.contains("fold-active")) {
        el.classList.remove("fold-active")
    } else {
        el.classList.add("fold-active")
    }
}

