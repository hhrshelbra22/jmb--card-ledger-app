"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  RecordSaleSchema,
  type RecordSalePayload,
} from "@/lib/validators/sales";
import { useRecordSale } from "@/lib/query/sales";
import { useInventoryLots } from "@/lib/query/inventory";
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
import { Plus, Package, CalendarDays, Tag } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

const PLATFORMS = ["eBay", "TCGPlayer", "Facebook", "Local", "Other"] as const;

interface RecordSaleDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Format "2026-03-06" → "Mar 6, 2026" */
function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Lot = {
  id: string;
  card_name: string;
  set_name: string;
  game: string;
  condition: string;
  variant?: string;
  purchase_date: string;
  created_at: string;
  cost_per_card: string | number;
  qty_on_hand: number;
};

/** Returns 1-based lot number ordered by purchase_date ASC, created_at ASC */
function getLotNumber(lots: Lot[], current: Lot): number {
  return (
    [...lots]
      .filter(
        (l) =>
          l.card_name === current.card_name &&
          l.set_name === current.set_name &&
          l.game === current.game &&
          l.condition === current.condition
      )
      .sort(
        (a, b) =>
          new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime() ||
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .findIndex((l) => l.id === current.id) + 1
  );
}

function siblingsCount(lots: Lot[], current: Lot): number {
  return lots.filter(
    (l) =>
      l.card_name === current.card_name &&
      l.set_name === current.set_name &&
      l.game === current.game &&
      l.condition === current.condition
  ).length;
}

export function RecordSaleDrawer({
  open: controlledOpen,
  onOpenChange,
}: RecordSaleDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const recordSale = useRecordSale();
  const { data: inventoryData } = useInventoryLots({ page: 1, pageSize: 200 });
  const lots: Lot[] = inventoryData?.data ?? [];

  const form = useForm<RecordSalePayload>({
    resolver: zodResolver(
      RecordSaleSchema
    ) as import("react-hook-form").Resolver<RecordSalePayload>,
    defaultValues: {
      sale_date: new Date().toISOString().split("T")[0],
      platform: "",
      card_name: "",
      game: "pokemon",
      set_name: "",
      variant: "",
      condition: "NM",
      qty_sold: 1,
      sale_price_each: 0,
      platform_fee: 0,
      processing_fee: 0,
      shipping_cost: 0,
      other_fees: 0,
    },
  });

  const qtySold = form.watch("qty_sold") ?? 1;
  const salePriceEach = form.watch("sale_price_each") ?? 0;
  const platformFee = form.watch("platform_fee") ?? 0;
  const processingFee = form.watch("processing_fee") ?? 0;
  const shippingCost = form.watch("shipping_cost") ?? 0;
  const otherFees = form.watch("other_fees") ?? 0;

  const grossRevenue = qtySold * salePriceEach;
  const totalFees = platformFee + processingFee + shippingCost + otherFees;
  const netProceeds = grossRevenue - totalFees;
  const estimatedProfit = netProceeds;

  async function onSubmit(values: RecordSalePayload) {
    await recordSale.mutateAsync(values);
    form.reset();
    setOpen(false);
  }

  const currentLot = lots.find(
    (l) =>
      l.card_name === form.watch("card_name") &&
      l.set_name === form.watch("set_name") &&
      l.game === form.watch("game") &&
      l.condition === form.watch("condition")
  );

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      {controlledOpen == null && (
        <DrawerTrigger asChild>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Record Sale
          </Button>
        </DrawerTrigger>
      )}

      <DrawerContent className="w-full sm:max-w-[520px] ml-auto flex flex-col h-full">
        <DrawerHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-5 shrink-0">
          <DrawerTitle className="text-base sm:text-lg">Record a Sale</DrawerTitle>
        </DrawerHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col flex-1 min-h-0"
        >
          <Form {...form}>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-5 sm:space-y-6">

              {/* ── Card Identity ── */}
              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Card Identity
                </h4>

                <FormField
                  control={form.control}
                  name="card_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Card</FormLabel>
                      <Select
                        value={currentLot?.id ?? ""}
                       onValueChange={(id) => {
                          const lot = lots.find((l) => l.id === id);
                          if (lot) {
                            form.setValue("card_name", lot.card_name);
                            form.setValue("set_name", lot.set_name);
                            form.setValue("game", lot.game as "pokemon" | "yugioh" | "riftbound");
                            form.setValue("variant", lot.variant ?? "");
                            form.setValue("condition", lot.condition as "NM" | "LP" | "MP" | "HP" | "DMG");
                          }
                        }}
                      >
                        <FormControl>
                          {/* Trigger shows selected lot summary */}
                          <SelectTrigger className="bg-input-background h-auto min-h-[40px] text-xs sm:text-sm py-2 px-3">
                            {currentLot ? (
                              <div className="flex items-center gap-2 text-left">
                                <span className="font-medium truncate">
                                  {currentLot.card_name}
                                </span>
                                {siblingsCount(lots, currentLot) > 1 && (
                                  <span className="shrink-0 text-[10px] font-semibold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                                    Lot {getLotNumber(lots, currentLot)}
                                  </span>
                                )}
                                <span className="shrink-0 text-[11px] text-muted-foreground ml-auto">
                                  {currentLot.qty_on_hand} avail
                                </span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Select from inventory..." />
                            )}
                          </SelectTrigger>
                        </FormControl>

                        {/* Dropdown — full width of trigger, two-line rows */}
                        <SelectContent
                          className="w-[var(--radix-select-trigger-width)] p-1"
                          position="popper"
                          sideOffset={4}
                        >
                          {lots.length === 0 && (
                            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                              No inventory available
                            </div>
                          )}

                          {lots.map((lot) => {
                            const lotNum = getLotNumber(lots, lot);
                            const isMulti = siblingsCount(lots, lot) > 1;

                            return (
                              <SelectItem
                                key={lot.id}
                                value={lot.id}
                                // Remove default truncation so our layout controls width
                                className="rounded-md py-2.5 px-2.5 cursor-pointer focus:bg-accent data-[state=checked]:bg-primary/10 [&>span:first-child]:hidden"
                              >
                                <div className="flex flex-col gap-1 w-full">

                                  {/* ── Row 1: card name + lot badge + qty pill ── */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs sm:text-sm font-medium leading-snug flex-1">
                                      {lot.card_name}
                                    </span>
                                    {isMulti && (
                                      <span className="shrink-0 text-[10px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                                        Lot {lotNum}
                                      </span>
                                    )}
                                    <span
                                      className={`shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                                        lot.qty_on_hand === 0
                                          ? "bg-destructive/15 text-destructive"
                                          : "bg-muted text-foreground"
                                      }`}
                                    >
                                      {lot.qty_on_hand} avail
                                    </span>
                                  </div>

                                  {/* ── Row 2: set · condition · date · cost ── */}
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                                      {lot.set_name}
                                    </span>

                                    <span className="text-[11px] text-muted-foreground/40">·</span>

                                    <span className="text-[11px] font-medium text-muted-foreground">
                                      {lot.condition}
                                    </span>

                                    <span className="text-[11px] text-muted-foreground/40">·</span>

                                    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground whitespace-nowrap">
                                      <CalendarDays className="size-3 shrink-0" />
                                      {formatDate(lot.purchase_date)}
                                    </span>

                                    <span className="text-[11px] text-muted-foreground/40">·</span>

                                    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground whitespace-nowrap">
                                      <Tag className="size-3 shrink-0" />
                                      {formatCurrency(Number(lot.cost_per_card))}/card
                                    </span>
                                  </div>

                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Hidden identity fields */}
                {(["game", "set_name", "variant", "condition"] as const).map((name) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem className="sr-only">
                        <FormControl>
                          <input type="hidden" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}

                <FormField
                  control={form.control}
                  name="qty_sold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Quantity Sold</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          className="bg-input-background h-8 sm:h-9 text-xs sm:text-sm"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10) || 1)
                          }
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Sale Details ── */}
              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Sale Details
                </h4>

                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Platform</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                          {PLATFORMS.map((platform) => (
                            <button
                              key={platform}
                              type="button"
                              onClick={() => field.onChange(platform)}
                              className={`p-1.5 sm:p-2 rounded-lg border-2 text-xs transition-all ${
                                field.value === platform
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              {platform}
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="sale_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Sale Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="bg-input-background h-8 sm:h-9 text-xs sm:text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sale_price_each"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Price Each ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step={0.01}
                            placeholder="0.00"
                            className="font-mono text-right bg-input-background h-8 sm:h-9 text-xs sm:text-sm"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                {grossRevenue > 0 && (
                  <div className="p-2.5 sm:p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Gross Revenue</p>
                    <p className="text-base sm:text-lg font-mono">
                      {formatCurrency(grossRevenue)}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Fees ── */}
              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-xs sm:text-sm text-muted-foreground font-medium">Fees</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {(
                    [
                      { name: "platform_fee", label: "Platform Fee ($)" },
                      { name: "processing_fee", label: "Processing Fee ($)" },
                      { name: "shipping_cost", label: "Shipping Cost ($)" },
                      { name: "other_fees", label: "Other Fees ($)" },
                    ] as const
                  ).map(({ name, label }) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm">{label}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step={0.01}
                              placeholder="0.00"
                              className="font-mono text-right bg-input-background h-8 sm:h-9 text-xs sm:text-sm"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                {totalFees > 0 && (
                  <div className="p-2.5 sm:p-3 bg-destructive/10 rounded-lg">
                    <p className="text-xs text-destructive">Total Fees</p>
                    <p className="text-base sm:text-lg font-mono text-destructive">
                      -{formatCurrency(totalFees)}
                    </p>
                  </div>
                )}
              </div>

              {/* ── FIFO Preview ── */}
              {form.watch("card_name") && salePriceEach > 0 && (
                <div className="p-3 sm:p-4 border-2 border-primary/30 bg-primary/5 rounded-lg space-y-2">
                  <p className="text-xs sm:text-sm text-primary font-medium">FIFO Preview</p>
                  <p className="text-xs text-muted-foreground">
                    Will consume {qtySold} card(s) from oldest lot first (FIFO).
                    Cost basis calculated on record.
                  </p>
                  <div className="flex justify-between pt-2 border-t border-primary/20 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Net Proceeds</p>
                      <p className="font-mono text-sm sm:text-base">
                        {formatCurrency(netProceeds)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Est. Profit</p>
                      <p
                        className={`font-mono text-sm sm:text-base ${
                          estimatedProfit >= 0 ? "text-profit" : "text-loss"
                        }`}
                      >
                        {formatCurrency(estimatedProfit)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Sticky footer ── */}
            <div className="flex gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-border shrink-0">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-8 sm:h-9 text-xs sm:text-sm"
                disabled={recordSale.isPending}
              >
                {recordSale.isPending ? "Recording..." : "Record Sale"}
              </Button>
            </div>
          </Form>
        </form>
      </DrawerContent>
    </Drawer>
  );
}