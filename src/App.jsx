import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import AdvancedBackgroundChanger from './AdvancedBackgroundChanger'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <AdvancedBackgroundChanger/>
    </>
  )
}

export default App
