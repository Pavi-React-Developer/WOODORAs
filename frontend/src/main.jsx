import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import SwiperCore from 'swiper'

// Defensive monkey-patch for Swiper React 18+ strict mode unmount bug
// Swiper sometimes calls update() when swiper.el is undefined during rapid remounts.
if (SwiperCore && SwiperCore.prototype && SwiperCore.prototype.update) {
  const originalUpdate = SwiperCore.prototype.update;
  SwiperCore.prototype.update = function(...args) {
    if (!this || this.destroyed || !this.el) return;
    return originalUpdate.apply(this, args);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
