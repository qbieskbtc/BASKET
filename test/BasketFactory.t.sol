// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { BasketFactory } from "../src/BasketFactory.sol";
import { BasketVault } from "../src/BasketVault.sol";
import { TestBase } from "./TestBase.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";
import { MockRouteValidator } from "./mocks/MockRouteValidator.sol";

contract BasketFactoryTest is TestBase {
    BasketFactory internal factory;
    MockRouteValidator internal validator;
    MockERC20 internal tokenA;
    MockERC20 internal tokenB;

    function setUp() public {
        validator = new MockRouteValidator();
        factory = new BasketFactory(address(validator));
        tokenA = new MockERC20("Token A", "A");
        tokenB = new MockERC20("Token B", "B");
        validator.setSupported(address(tokenA), true);
        validator.setSupported(address(tokenB), true);
    }

    function testCreatesValidBasket() public {
        address[] memory components = _twoComponents();
        uint16[] memory weights = _twoWeights();

        address basket = factory.createBasket("PONS 2", "P2", components, weights);

        assertEq(factory.basketCount(), 1);
        assertEq(factory.basketAt(0), basket);
        assertEq(BasketVault(basket).creator(), address(this));
        assertEq(BasketVault(basket).componentCount(), 2);
    }

    function testRejectsDuplicateComponents() public {
        address[] memory components = new address[](2);
        components[0] = address(tokenA);
        components[1] = address(tokenA);

        vm.expectRevert();
        factory.createBasket("Bad", "BAD", components, _twoWeights());
    }

    function testRejectsInvalidWeights() public {
        uint16[] memory weights = new uint16[](2);
        weights[0] = 5_000;
        weights[1] = 4_999;

        vm.expectRevert();
        factory.createBasket("Bad", "BAD", _twoComponents(), weights);
    }

    function testRejectsMoreThanTenAssets() public {
        address[] memory components = new address[](11);
        uint16[] memory weights = new uint16[](11);

        for (uint256 i; i < 11; ++i) {
            MockERC20 token = new MockERC20("Token", "T");
            validator.setSupported(address(token), true);
            components[i] = address(token);
            weights[i] = uint16(i == 10 ? 0 : 1_000);
        }

        vm.expectRevert();
        factory.createBasket("Bad", "BAD", components, weights);
    }

    function testRejectsUnsupportedToken() public {
        MockERC20 unsupported = new MockERC20("Unsupported", "NOPE");
        address[] memory components = new address[](2);
        components[0] = address(tokenA);
        components[1] = address(unsupported);

        vm.expectRevert();
        factory.createBasket("Bad", "BAD", components, _twoWeights());
    }

    function _twoComponents() private view returns (address[] memory components) {
        components = new address[](2);
        components[0] = address(tokenA);
        components[1] = address(tokenB);
    }

    function _twoWeights() private pure returns (uint16[] memory weights) {
        weights = new uint16[](2);
        weights[0] = 5_000;
        weights[1] = 5_000;
    }
}

