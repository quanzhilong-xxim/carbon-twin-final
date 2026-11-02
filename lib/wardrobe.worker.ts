/// <reference lib="webworker" />
import { CLOTHING_PROMPTS } from './wardrobe';
let classifier:Awaited<ReturnType<typeof create>>|null=null;
async function create(){
 const {pipeline,env}=await import('@huggingface/transformers');
 env.allowLocalModels=false;
 if(env.backends.onnx.wasm)env.backends.onnx.wasm.numThreads=1;
 return pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32',{device:'wasm',dtype:'q8',progress_callback:(value:unknown)=>self.postMessage({type:'progress',value})});
}
self.onmessage=async(event:MessageEvent<{image:string}>)=>{
 try{classifier??=await create();const result=await classifier(event.data.image,CLOTHING_PROMPTS);self.postMessage({type:'result',result});}
 catch(error){self.postMessage({type:'error',message:error instanceof Error?error.message:'本地分类不可用'});}
};
