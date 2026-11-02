const prompts=['a photo of a person wearing a short sleeve t-shirt','a photo of a person wearing a long sleeve shirt','a photo of a person wearing a coat or jacket','a photo of a person wearing long trousers','a photo of a person wearing shorts','a photo of a person wearing a knitted sweater','a photo of a person wearing blue denim jeans'];
let classifier;
self.onmessage=async ({data})=>{
 try {
  if(!classifier){
   const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
   env.allowLocalModels=false;
   if(env.backends.onnx.wasm)env.backends.onnx.wasm.numThreads=1;
   classifier=await pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32',{device:'wasm',dtype:'q8',progress_callback:value=>self.postMessage({type:'progress',value})});
  }
  self.postMessage({type:'result',result:await classifier(data.image,prompts)});
 } catch(error){self.postMessage({type:'error',message:error instanceof Error?error.message:'本地分类不可用'});}
};
