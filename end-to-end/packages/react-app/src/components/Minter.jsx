import { Card, Upload, Input, Button, Col } from "antd";
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import React, { useState } from "react";
import { NFTStorage } from 'nft.storage';
import { useContractLoader } from "../hooks";
import Account from "./Account";
import { Transactor } from "../helpers";
import { NFT_STORAGE_KEY, DEFAULT_CONTRACT_NAME } from "../constants";


/**
   * Creates a new NFTVoucher object and signs it using this LazyMinter's signing key.
   * 
   * @param {ethers.BigNumber | number} tokenId the id of the un-minted NFT
   * @param {string} uri the metadata URI to associate with this NFT
   * @param {ethers.BigNumber | number} minPrice the minimum price (in wei) that the creator will accept to redeem this NFT. defaults to zero
   * 
   * @returns {NFTVoucher}
   */
async function createVoucher(tokenId, uri, minPrice = 0) {
  const voucher = { tokenId, uri, minPrice }
  const domain = await this._signingDomain()
  const types = {
    NFTVoucher: [
      { name: "tokenId", type: "uint256" },
      { name: "minPrice", type: "uint256" },
      { name: "uri", type: "string" },
    ]
  }
  const signature = await this.signer._signTypedData(domain, types, voucher)
  return {
    ...voucher,
    signature,
  }
}

/**
 * @private
 * @returns {object} the EIP-721 signing domain, tied to the chainId of the signer
 */
async function _signingDomain() {
  if (this._domain != null) {
    return this._domain
  }
  const chainId = await this.contract.getChainID()
  this._domain = {
    name: SIGNING_DOMAIN_NAME,
    version: SIGNING_DOMAIN_VERSION,
    verifyingContract: this.contract.address,
    chainId,
  }
  return this._domain
}





async function mintNFT({ contract, ownerAddress, provider, gasPrice, setStatus, image, name, description }) {

  // First we use the nft.storage client library to add the image and metadata to IPFS / Filecoin
  const client = new NFTStorage({ token: NFT_STORAGE_KEY });
  setStatus("Uploading to nft.storage...")
  const metadata = await client.store({
    name,
    description,
    image,
  });
  setStatus(`Upload complete! Minting token with metadata URI: ${metadata.url}`);

  // the returned metadata.url has the IPFS URI we want to add.
  // our smart contract already prefixes URIs with "ipfs://", so we remove it before calling the `mintToken` function
  const metadataURI = metadata.url.replace(/^ipfs:\/\//, "");

  const lazyMinter = new LazyMinter({ contract, signer: minter })
  const minPrice = ethers.constants.WeiPerEther // charge 1 Eth

  // get metadata hash replace 1
  const voucher = await lazyMinter.createVoucher(1, metadata.url, minPrice)

  return voucher.tokenId;


  // scaffold-eth's Transactor helper gives us a nice UI popup when a transaction is sent
  /* const transactor = Transactor(provider, gasPrice);
   const tx = await transactor(contract.mintToken(ownerAddress, metadataURI));
 
   setStatus("Blockchain transaction sent, waiting confirmation...");
 
   // Wait for the transaction to be confirmed, then get the token ID out of the emitted Transfer event.
   const receipt = await tx.wait();
  
   let tokenId = null;
   for (const event of receipt.events) {
     if (event.event !== 'Transfer') {
         continue
     }
     tokenId = event.args.tokenId.toString();
     break;
   }
   setStatus(`Minted token #${tokenId}`);
   return tokenId;*/
}

export default function Minter({
  customContract,
  account,
  gasPrice,
  signer,
  provider,
  name,
  price,
  blockExplorer,
}) {
  const contracts = useContractLoader(signer);
  let contract;
  if (!name) {
    name = DEFAULT_CONTRACT_NAME;
  }
  if (!customContract) {
    contract = contracts ? contracts[name] : "";
  } else {
    contract = customContract;
  }

  const address = contract ? contract.address : "";

  const [file, setFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [nftName, setName] = useState("");
  const [description, setDescription] = useState("");
  const [minting, setMinting] = useState(false);
  const [status, setStatus] = useState("");
  const [tokenId, setTokenId] = useState(null);

  const beforeUpload = (file, fileList) => {
    console.log(file, fileList);
    setFile(file);
    setPreviewURL(URL.createObjectURL(file));
    return false;
  }



  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>
        Choose file
      </div>
    </div>
  );

  const uploadView = (
    <div className="flex flex-col items-center border-dotted border-4 border-gray-300 py-4 px-2 rounded-2xl ">
      <p className="uppercase text-gray-400 mb-6 text-center">
        PNG, GIF, WEBP, MP4 or MP3. Max 100mb.
      </p>
      <Upload
        name="avatar"
        accept=".jpeg,.jpg,.png,.gif"
        listType="picture-card"
        className="avatar-uploader"
        showUploadList={false}
        action="https://www.mocky.io/v2/5cc8019d300000980a055e76"
        beforeUpload={beforeUpload}
      >
        {uploadButton}
      </Upload>
    </div>
  );

  const preview = previewURL ? <img src={previewURL} style={{ maxWidth: "800px" }} /> : <div />

  const nameField = (
    <Input placeholder="Enter a name for your NFT" onChange={e => {
      setName(e.target.value);
    }} />
  );

  const descriptionField = (
    <Input.TextArea placeholder="Enter a description" onChange={e => {
      setDescription(e.target.value);
    }} />
  );

  const mintEnabled = file != null && !!nftName;

  const startMinting = () => {
    console.log(`minting nft with name ${nftName}`);
    setMinting(true);
    signer.getAddress().then(ownerAddress => {
      mintNFT({
        contract,
        provider,
        ownerAddress,
        gasPrice,
        setStatus,
        name: nftName,
        image: file,
        description
      }).then(newTokenId => {
        setMinting(false);
        console.log('minting complete');
        setTokenId(newTokenId);
      })
    });
  }

  const startCreateVoucher = () => {

  }

  const mintButton = (
    <Button type="primary" disabled={!mintEnabled} onClick={startMinting}>
      {minting ? <LoadingOutlined /> : "Mint!"}
    </Button>
  )

  const minterForm = (
    <div style={{ margin: "auto", width: "70vw" }}>
      <Card
        // title={
        //   <div>
        //     {name}
        //     <div style={{ float: "right" }}>
        //       <Account
        //         address={address}
        //         localProvider={provider}
        //         injectedProvider={provider}
        //         mainnetProvider={provider}
        //         price={price}
        //         blockExplorer={blockExplorer}
        //       />
        //       {account}
        //     </div>
        //   </div>
        // }
        size="large"
        style={{ marginTop: 25, width: "100%" }}
        loading={false}
      >
        {file == null && uploadView}

        {preview}
        {nameField}
        {descriptionField}
        {mintButton}
        {status}
      </Card>
    </div>
  );


  return minterForm;
}
