'use client';
import {useEffect} from 'react';
import scripts from './scripts.json';
export default function ExistingInteractions(){
 useEffect(()=>{let cancelled=false;async function load(){for(const src of scripts){if(cancelled)return;await new Promise(resolve=>{const script=document.createElement('script');script.src=src;script.async=false;script.onload=resolve;script.onerror=resolve;document.body.append(script);});}}load();return()=>{cancelled=true;};},[]);
 return null;
}
