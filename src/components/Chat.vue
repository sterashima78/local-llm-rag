<template>
  <div>
    <template v-if="initializeMessage === ''">
      <textarea v-model="userInput" rows="4" cols="50"></textarea><br />
      <button @click="sendMessage">Send</button>
      <p v-for="r in response" v-html="r"></p>
    </template>
    <p v-else>{{initializeMessage}}</p>
    
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import * as webllm from '@mlc-ai/web-llm';
const pagefindPath = "/local-llm-rag/pagefind/pagefind.js"
let pagefind
const userInput = ref('');
const response = ref([]);
const initializeMessage = ref("モデルの準備中...")
let engine;

async function initializeLLM() {
  try {
    engine = await webllm.CreateMLCEngine('gemma-2b-it-q4f16_1-MLC', {
      initProgressCallback: (progress) => initializeMessage.value = progress.text,
    });
  } catch (e) {
    initializeMessage.value = `retry: ${e.getMessage()}`

    initializeLLM()
  }

  initializeMessage.value = ""
}

async function sendMessage() {
  const q = userInput.value.trim()
  if(q === "") return
  response.value = [...response.value, "コンテンツを検索中..."]
  const search = await pagefind.search(q);
  const searchResult = (await Promise.all(search.results.slice(0, 5).map(r => r.data())));
  response.value = [...response.value, "検索結果"]
  searchResult.forEach((r,i) => {
    response.value = [...response.value, `<a href="${r.url.replace(/(^\/.*?)\//, "$1/documents/")}" target="_blank">${i + 1}: ${r.meta.title}</a>`]
  })
  const searchResultContents = searchResult.map((x,i) => `### ${i} \n\n${x.raw_content}`).join("\n\n")

  const messages = [
    { role: 'system', content: `あなたには質問と前提情報が渡されます。前提情報を元にして、質問に日本語で回答してください。回答は簡潔にしてください`},
    { role: 'user', content: `
    ## 質問

    ${userInput.value}
    
    ## 前提情報

    ${searchResultContents}
    ` },
  ];

  response.value = [...response.value, "回答を生成中..."]
  const reply = await engine.chat.completions.create({
    messages,
  });
  response.value = [...response.value, reply.choices[0].message.content]
}
onMounted(async ()=> {
  pagefind = import.meta.env.DEV ? await import("/local-llm-rag/pagefind/pagefind.js?url") : await import(/* @vite-ignore */ pagefindPath);
  pagefind.init();
  initializeLLM();
})

</script>

<style scoped>
textarea {
  width: 100%;
}
button {
  margin-top: 10px;
}
</style>
