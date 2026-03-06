"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateLotSchema, type CreateLotPayload } from "@/lib/validators/inventory";
import { useAddInventoryLot } from "@/lib/query/inventory";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useState, useCallback } from "react";
import { MarketPriceDisplay, type MarketPriceData } from "@/components/inventory/MarketPriceDisplay";
import { CardSearchInput } from "@/components/inventory/CardSearchInput";

const GAMES = ["pokemon", "yugioh", "riftbound"] as const;
const CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"] as const;

interface AddLotDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddLotDrawer({ open: controlledOpen, onOpenChange }: AddLotDrawerProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [lastMarketData, setLastMarketData] = useState<MarketPriceData | null>(null);
  const [cardSelected, setCardSelected] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const addLot = useAddInventoryLot();

  const form = useForm<CreateLotPayload>({
    resolver: zodResolver(CreateLotSchema) as Resolver<CreateLotPayload>,
    defaultValues: {
      game: "pokemon",
      card_name: "",
      set_name: "",
      variant: "",
      condition: "NM",
      qty_initial: 1,
      purchase_date: new Date().toISOString().split("T")[0],
      vendor: "",
      total_cost: 0,
    },
  });

  const handleUsePrice = useCallback(
    (valuePerUnit: number) => {
      form.setValue("total_cost", valuePerUnit * form.getValues("qty_initial"));
    },
    [form]
  );

  // Called when user picks a card from the search dropdown
  function handleCardSelect(cardName: string, setName: string) {
    form.setValue("card_name", cardName, { shouldValidate: true });
    form.setValue("set_name", setName, { shouldValidate: true });
    setCardSelected(true);
    setLastMarketData(null); // reset market data when card changes
  }

  // Clear selected card and let user search again
  function handleClearCard() {
    form.setValue("card_name", "");
    form.setValue("set_name", "");
    setCardSelected(false);
    setLastMarketData(null);
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      form.reset();
      setLastMarketData(null);
      setCardSelected(false);
    }
    setOpen(value);
  }

  async function onSubmit(values: CreateLotPayload) {
    const payload = {
      ...values,
      market_estimate: lastMarketData
        ? {
            estimated_value_each: lastMarketData.estimated_value_each,
            source_url: lastMarketData.source_url,
          }
        : undefined,
    };
    await addLot.mutateAsync(payload);
    form.reset();
    setLastMarketData(null);
    setCardSelected(false);
    setOpen(false);
  }

  const selectedCardName = form.watch("card_name");
  const selectedSetName = form.watch("set_name");

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} direction="right">
      {controlledOpen == null && (
        <DrawerTrigger asChild>
          <Button>
            <Plus className="size-4 mr-2" />
            Add lot
          </Button>
        </DrawerTrigger>
      )}

      <DrawerContent className="w-full sm:max-w-[480px] ml-auto flex flex-col h-full">
        <DrawerHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-5 shrink-0">
          <DrawerTitle className="text-base sm:text-lg">Add Inventory Lot</DrawerTitle>
        </DrawerHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col flex-1 min-h-0"
        >
          <Form {...form}>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-3 sm:space-y-4">

              {/* Game selector */}
              <FormField
                control={form.control}
                name="game"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs sm:text-sm">Game</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        // Reset card selection when game changes
                        handleClearCard();
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GAMES.map((g) => (
                          <SelectItem key={g} value={g} className="text-xs sm:text-sm capitalize">
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Card search — replaces manual card_name + set_name inputs */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-medium leading-none">
                  Card name
                </label>

                {!cardSelected ? (
                  // Search input — shown when no card selected yet
                  <CardSearchInput
                    game={form.watch("game")}
                    onSelect={handleCardSelect}
                  />
                ) : (
                  // Selected card confirmation pill — shown after selection
                  <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {selectedCardName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {selectedSetName}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={handleClearCard}
                        aria-label="Clear card selection"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Show validation errors for card_name */}
                {form.formState.errors.card_name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.card_name.message}
                  </p>
                )}
                {form.formState.errors.set_name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.set_name.message}
                  </p>
                )}
              </div>

              {/* Variant */}
              <FormField
                control={form.control}
                name="variant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs sm:text-sm">
                      Variant{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Holo, 1st Edition, Reverse Holo"
                        className="h-8 sm:h-9 text-xs sm:text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Condition */}
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs sm:text-sm">Condition</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONDITIONS.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs sm:text-sm">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Market price — only shows after card is selected */}
              {cardSelected && (
                <MarketPriceDisplay
                  cardName={selectedCardName}
                  game={form.watch("game")}
                  setName={selectedSetName}
                  condition={form.watch("condition")}
                  onUsePrice={handleUsePrice}
                  onMarketData={setLastMarketData}
                />
              )}

              {/* Qty + Purchase date */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="qty_initial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10) || 0)
                          }
                          className="h-8 sm:h-9 text-xs sm:text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purchase_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Purchase date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="h-8 sm:h-9 text-xs sm:text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Vendor + Total cost */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">
                        Vendor{" "}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          className="h-8 sm:h-9 text-xs sm:text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="total_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Total cost ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                          className="h-8 sm:h-9 text-xs sm:text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Form>

          {/* Sticky footer */}
          <DrawerFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border shrink-0">
            <Button
              type="submit"
              disabled={addLot.isPending || !cardSelected}
              className="w-full h-8 sm:h-9 text-xs sm:text-sm"
            >
              {addLot.isPending ? "Adding..." : "Add lot"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}