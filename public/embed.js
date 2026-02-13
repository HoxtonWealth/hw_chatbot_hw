(function () {
  'use strict'

  // Read config from script tag data attributes
  var script = document.currentScript
  var baseUrl = script.src.replace('/embed.js', '')
  var position = script.getAttribute('data-position') || 'bottom-right'
  var primaryColor = script.getAttribute('data-primary-color') || '#171717'
  var title = script.getAttribute('data-title') || 'Chat with us'
  var width = script.getAttribute('data-width') || '380'
  var height = script.getAttribute('data-height') || '520'

  // Determine positioning
  var isRight = position.includes('right')
  var isBottom = position.includes('bottom')

  // Create container
  var container = document.createElement('div')
  container.id = 'kb-chat-widget'
  container.style.cssText =
    'position:fixed;z-index:999999;' +
    (isBottom ? 'bottom:20px;' : 'top:20px;') +
    (isRight ? 'right:20px;' : 'left:20px;') +
    'font-family:-apple-system,BlinkMacSystemFont,sans-serif;'

  // Create chat button
  var button = document.createElement('button')
  button.setAttribute('aria-label', title)
  button.style.cssText =
    'width:56px;height:56px;border-radius:28px;border:none;cursor:pointer;' +
    'background:' + primaryColor + ';color:white;' +
    'box-shadow:0 4px 12px rgba(0,0,0,0.15);' +
    'display:flex;align-items:center;justify-content:center;' +
    'transition:transform 0.2s,box-shadow 0.2s;'
  button.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>'
  button.onmouseenter = function () {
    button.style.transform = 'scale(1.08)'
    button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)'
  }
  button.onmouseleave = function () {
    button.style.transform = 'scale(1)'
    button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
  }

  // Create iframe container (hidden by default)
  var chatFrame = document.createElement('div')
  chatFrame.style.cssText =
    'display:none;position:absolute;' +
    (isBottom ? 'bottom:70px;' : 'top:70px;') +
    (isRight ? 'right:0;' : 'left:0;') +
    'width:' + width + 'px;height:' + height + 'px;' +
    'border-radius:16px;overflow:hidden;' +
    'box-shadow:0 8px 30px rgba(0,0,0,0.12);' +
    'border:1px solid rgba(0,0,0,0.08);'

  // Create iframe
  var iframe = document.createElement('iframe')
  iframe.src = baseUrl + '/embed/chat'
  iframe.style.cssText = 'width:100%;height:100%;border:none;'
  iframe.setAttribute('title', title)
  iframe.setAttribute('loading', 'lazy')

  chatFrame.appendChild(iframe)

  // Toggle logic
  var isOpen = false
  button.onclick = function () {
    isOpen = !isOpen
    chatFrame.style.display = isOpen ? 'block' : 'none'

    // Switch icon: chat bubble <-> X
    if (isOpen) {
      button.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
      if (!iframe.src || iframe.src === 'about:blank') {
        iframe.src = baseUrl + '/embed/chat'
      }
    } else {
      button.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>'
    }
  }

  // Assemble and append to page
  container.appendChild(chatFrame)
  container.appendChild(button)
  document.body.appendChild(container)
})()
