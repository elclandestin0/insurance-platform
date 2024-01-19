pragma solidity >=0.5.0;


interface IWETH {
    function deposit() external payable;
    function transfer(address to, uint value) external returns (bool);
    function withdraw(uint) external;

    // Add the balanceOf function
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address src, address dst, uint wad) external returns(bool);
}