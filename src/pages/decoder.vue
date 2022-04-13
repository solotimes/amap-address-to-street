<template>
  <!-- eslint-disable tailwindcss/no-custom-classname -->
  <header>
    <label>
      <input
        type="file"
        @change="onImport"
      >
      导入文件
    </label>
  </header>
  <main
    class="flex flex-col justify-center items-center py-16 px-4 mx-auto max-w-3xl h-screen"
  >
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-html="content" />
  </main>
  <div
    v-if="isLoading"
    class="mask-loading"
  >
    <div class="loading">
      <div :style="{ width: loadingWidth + '%' }" />
    </div>
    <div style="padding-left: 10px">
      {{ parseInt(loadingWidth) }}%
    </div>
  </div>
</template>

<script setup>
/* eslint-disable no-unused-vars */
/* eslint-disable camelcase */
/* global AMap */
import { ref } from 'vue';
import {
  read, utils, writeFile, set_cptable,
} from 'xlsx';
/* load the codepage support library for extended support with older formats  */
import * as cptable from 'xlsx/dist/cpexcel.full.mjs';

const isLoading = ref(false);
const loadingWidth = ref(0);

set_cptable(cptable);
let geocoder;
AMap.plugin('AMap.Geocoder', () => {
  geocoder = new AMap.Geocoder({
    city: '全国',
  });
});
const content = ref();

function getStreet(address) {
  return new Promise((resolve) => {
    geocoder.getLocation(address, (status, result) => {
      if (status === 'complete' && result.geocodes.length) {
        const lnglat = result.geocodes[0].location;
        geocoder.getAddress(lnglat, (stat, res) => {
          if (stat === 'complete' && res.regeocode) {
            const street = res.regeocode.addressComponent.township;
            // rows[0]['街道'] = street;
            resolve(street);
          } else {
            // console.error('根据地址查询地址失败');
            resolve('');
          }
        });
      } else {
        resolve('');
      }
      // console.log(status, result);
    });
  });
}

function onImport(evt) {
  const { files } = evt.target;

  if (!files || files.length === 0) return;

  const file = files[0];

  const reader = new FileReader();
  reader.onload = async function onload(e) {
    // pre-process data
    let binary = '';
    const bytes = new Uint8Array(e.target.result);
    const length = bytes.byteLength;
    binary = bytes.reduce((str, byte) => str + String.fromCharCode(byte), '');

    /* read workbook */
    const wb = read(binary, { type: 'binary' });

    /* grab first sheet */
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    const rows = utils.sheet_to_json(ws);
    const header = Object.keys(rows[0]);

    // rows.splice(10, rows.length - 10);

    const addressKey = header.find((key) => key.match(/address/i));

    header.push('街道');

    isLoading.value = true;
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < rows.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      const street = await getStreet(rows[i][addressKey]);
      rows[i]['街道'] = street;
      loadingWidth.value = ((i + 1) / rows.length) * 100;
      // console.log(loadingWidth.value);
    }
    isLoading.value = false;

    const converted = utils.json_to_sheet(rows, { header });
    /* generate HTML */
    content.value = utils.sheet_to_html(converted);

    wb.Sheets[wsname] = converted;
    writeFile(wb, `街道信息${new Date().getTime()}.xlsx`);
  };

  reader.readAsArrayBuffer(file);
}
</script>

<style>
.mask-loading {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1111111;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #000;
}

.mask-loading .loading {
  width: 400px;
  height: 20px;
  overflow: hidden;
  background: #000;
  border: 1px solid #fff;
  border-radius: 10px;
}

.mask-loading .loading div {
  width: 0;
  height: 20px;
  background: #fff;
  transition-timing-function: ease-in;
  transition-duration: 500ms;
}

.mask {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  color: #fff;
}

</style>
