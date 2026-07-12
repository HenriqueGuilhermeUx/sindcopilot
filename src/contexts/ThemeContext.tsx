import { createContext, useContext, useEffect, useState } from "react";
type Theme="light"|"dark";
const C=createContext({theme:"light" as Theme,toggleTheme:()=>{}});
export function ThemeProvider({children,defaultTheme="light"}:{children:React.ReactNode;defaultTheme?:Theme}){const[theme,setTheme]=useState<Theme>(()=>(localStorage.getItem("theme") as Theme)||defaultTheme);useEffect(()=>{document.documentElement.classList.toggle("dark",theme==="dark");localStorage.setItem("theme",theme)},[theme]);return <C.Provider value={{theme,toggleTheme:()=>setTheme(t=>t==="light"?"dark":"light")}}>{children}</C.Provider>}
export const useTheme=()=>useContext(C);
