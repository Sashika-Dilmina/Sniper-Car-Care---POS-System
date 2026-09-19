import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Global DOM patch to prevent React unmount crashes caused by Google Translate font tags & browser extensions
if (typeof window !== 'undefined') {
  if (Node.prototype.removeChild) {
    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function (child) {
      if (child.parentNode !== this) {
        if (console && console.warn) {
          console.warn('Cannot remove a child from a different parent', child, this);
        }
        return child;
      }
      return originalRemoveChild.apply(this, arguments);
    };
  }

  if (Node.prototype.insertBefore) {
    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (newNode, referenceNode) {
      if (referenceNode && referenceNode.parentNode !== this) {
        if (console && console.warn) {
          console.warn('Cannot insert before a reference node from a different parent', referenceNode, this);
        }
        return newNode;
      }
      return originalInsertBefore.apply(this, arguments);
    };
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

